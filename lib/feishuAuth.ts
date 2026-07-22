import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const FEISHU_OAUTH_URL = "https://accounts.feishu.cn/open-apis/authen/v1/authorize";
const FEISHU_TOKEN_URL = "https://open.feishu.cn/open-apis/authen/v2/oauth/token";

type OAuthTokenResponse = {
  code?: number;
  msg?: string;
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
  name?: string;
  en_name?: string;
  open_id?: string;
  union_id?: string;
  user_id?: string;
  tenant_key?: string;
  avatar_url?: string;
};

type StoredSession = {
  id: string;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt?: number;
  scope: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name?: string;
    enName?: string;
    openId?: string;
    unionId?: string;
    userId?: string;
    tenantKey?: string;
    avatarUrl?: string;
  };
};

type SessionFile = { version: 1; sessions: StoredSession[] };

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`尚未配置 ${name}`);
  return value;
}

function keyMaterial() {
  return crypto.createHash("sha256").update(required("TOKEN_ENCRYPTION_KEY")).digest();
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decrypt(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("加密凭证格式损坏");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyMaterial(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function signSessionId(sessionId: string) {
  const signature = crypto
    .createHmac("sha256", required("SESSION_SECRET"))
    .update(sessionId)
    .digest("base64url");
  return `${sessionId}.${signature}`;
}

function verifySignedSessionId(value?: string) {
  if (!value) return undefined;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return undefined;
  const sessionId = value.slice(0, separator);
  const supplied = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(signSessionId(sessionId).slice(separator + 1));
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return undefined;
  }
  return sessionId;
}

export function readCookie(header: string | undefined, name: string) {
  for (const part of (header || "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export class FeishuOAuthStore {
  private sessions = new Map<string, StoredSession>();
  private states = new Map<string, number>();
  private writeChain: Promise<void> = Promise.resolve();
  readonly cookieName = "sanhui_session";

  constructor(private readonly filePath: string) {}

  async initialize() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, "utf8")) as SessionFile;
      const now = Date.now();
      for (const session of parsed.sessions || []) {
        if (!session.refreshTokenExpiresAt || session.refreshTokenExpiresAt > now) {
          this.sessions.set(session.id, session);
        }
      }
      await this.persist();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await this.persist();
    }
  }

  configured() {
    return Boolean(
      process.env.FEISHU_APP_ID?.trim() &&
      process.env.FEISHU_APP_SECRET?.trim() &&
      process.env.FEISHU_OAUTH_REDIRECT_URI?.trim() &&
      process.env.SESSION_SECRET?.trim() &&
      process.env.TOKEN_ENCRYPTION_KEY?.trim(),
    );
  }

  authorizationUrl() {
    if (!this.configured()) throw new Error("飞书 OAuth 服务端配置不完整");
    const state = crypto.randomBytes(24).toString("base64url");
    this.states.set(state, Date.now() + 10 * 60 * 1000);
    const query = new URLSearchParams({
      client_id: required("FEISHU_APP_ID"),
      redirect_uri: required("FEISHU_OAUTH_REDIRECT_URI"),
      state,
      scope: process.env.FEISHU_OAUTH_SCOPES?.trim() || "offline_access auth:user.id:read",
    });
    return `${FEISHU_OAUTH_URL}?${query.toString()}`;
  }

  async exchangeCode(code: string, state: string) {
    const expiresAt = this.states.get(state);
    this.states.delete(state);
    if (!expiresAt || expiresAt < Date.now()) throw new Error("OAuth state 无效或已过期");
    if (!code) throw new Error("飞书没有返回授权码");

    const response = await fetch(FEISHU_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: required("FEISHU_APP_ID"),
        client_secret: required("FEISHU_APP_SECRET"),
        code,
        redirect_uri: required("FEISHU_OAUTH_REDIRECT_URI"),
      }),
    });
    const result = await response.json() as OAuthTokenResponse;
    if (!response.ok || result.code || !result.access_token) {
      throw new Error(result.msg || `飞书 OAuth 换取 token 失败（HTTP ${response.status}）`);
    }

    const now = Date.now();
    const session: StoredSession = {
      id: crypto.randomUUID(),
      encryptedAccessToken: encrypt(result.access_token),
      encryptedRefreshToken: result.refresh_token ? encrypt(result.refresh_token) : undefined,
      accessTokenExpiresAt: now + (result.expires_in || 7200) * 1000,
      refreshTokenExpiresAt: result.refresh_token
        ? now + (result.refresh_token_expires_in || 604800) * 1000
        : undefined,
      scope: result.scope || "",
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      user: {
        name: result.name,
        enName: result.en_name,
        openId: result.open_id,
        unionId: result.union_id,
        userId: result.user_id,
        tenantKey: result.tenant_key,
        avatarUrl: result.avatar_url,
      },
    };
    this.sessions.set(session.id, session);
    await this.persist();
    return { session, cookieValue: signSessionId(session.id) };
  }

  publicSession(cookieValue?: string) {
    const id = verifySignedSessionId(cookieValue);
    const session = id ? this.sessions.get(id) : undefined;
    if (!session) return { authenticated: false as const, configured: this.configured() };
    return {
      authenticated: true as const,
      configured: this.configured(),
      user: session.user,
      scope: session.scope,
      accessTokenExpiresAt: new Date(session.accessTokenExpiresAt).toISOString(),
      refreshTokenExpiresAt: session.refreshTokenExpiresAt
        ? new Date(session.refreshTokenExpiresAt).toISOString()
        : undefined,
    };
  }

  async refreshedPublicSession(cookieValue?: string) {
    const id = verifySignedSessionId(cookieValue);
    const session = id ? this.sessions.get(id) : undefined;
    if (!session) return this.publicSession(cookieValue);
    if (session.accessTokenExpiresAt > Date.now() + 60_000) {
      return this.publicSession(cookieValue);
    }
    if (
      !session.encryptedRefreshToken ||
      !session.refreshTokenExpiresAt ||
      session.refreshTokenExpiresAt <= Date.now()
    ) {
      this.sessions.delete(session.id);
      await this.persist();
      return { authenticated: false as const, configured: this.configured() };
    }

    const response = await fetch(FEISHU_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: required("FEISHU_APP_ID"),
        client_secret: required("FEISHU_APP_SECRET"),
        refresh_token: decrypt(session.encryptedRefreshToken),
      }),
    });
    const result = await response.json() as OAuthTokenResponse;
    if (!response.ok || result.code || !result.access_token) {
      throw new Error(result.msg || `刷新飞书用户凭证失败（HTTP ${response.status}）`);
    }

    const now = Date.now();
    session.encryptedAccessToken = encrypt(result.access_token);
    session.accessTokenExpiresAt = now + (result.expires_in || 7200) * 1000;
    if (result.refresh_token) {
      // 飞书刷新后旧 refresh_token 失效，必须原子替换为响应中的新值。
      session.encryptedRefreshToken = encrypt(result.refresh_token);
      session.refreshTokenExpiresAt =
        now + (result.refresh_token_expires_in || 604800) * 1000;
    }
    session.scope = result.scope || session.scope;
    session.updatedAt = new Date(now).toISOString();
    this.sessions.set(session.id, session);
    await this.persist();
    return this.publicSession(cookieValue);
  }

  async logout(cookieValue?: string) {
    const id = verifySignedSessionId(cookieValue);
    if (id) this.sessions.delete(id);
    await this.persist();
  }

  sessionCookie(cookieValue: string, secure: boolean) {
    return [
      `${this.cookieName}=${encodeURIComponent(cookieValue)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=604800",
      secure ? "Secure" : "",
    ].filter(Boolean).join("; ");
  }

  clearCookie(secure: boolean) {
    return [
      `${this.cookieName}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
      secure ? "Secure" : "",
    ].filter(Boolean).join("; ");
  }

  private persist() {
    this.writeChain = this.writeChain.then(async () => {
      const temporary = `${this.filePath}.${process.pid}.tmp`;
      const body: SessionFile = { version: 1, sessions: [...this.sessions.values()] };
      await fs.writeFile(temporary, JSON.stringify(body, null, 2), "utf8");
      await fs.rename(temporary, this.filePath);
    });
    return this.writeChain;
  }
}
