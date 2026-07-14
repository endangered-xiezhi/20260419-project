const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";

type FeishuTokenResponse = {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
  expire?: number;
};

type FeishuTable = {
  table_id: string;
  name: string;
  revision?: number;
};

type FeishuTableListResponse = {
  code?: number;
  msg?: string;
  data?: {
    items?: FeishuTable[];
  };
};

let tokenCache: { token: string; expiresAt: number } | null = null;

function requiredEnv(name: "FEISHU_APP_ID" | "FEISHU_APP_SECRET" | "FEISHU_BASE_APP_TOKEN") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Render 尚未配置 ${name}`);
  return value;
}

async function getTenantAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: requiredEnv("FEISHU_APP_ID"),
      app_secret: requiredEnv("FEISHU_APP_SECRET"),
    }),
  });
  const result = (await response.json()) as FeishuTokenResponse;

  if (!response.ok || result.code !== 0 || !result.tenant_access_token) {
    throw new Error(result.msg || "飞书应用身份验证失败");
  }

  tokenCache = {
    token: result.tenant_access_token,
    expiresAt: Date.now() + Math.max((result.expire || 7200) - 120, 60) * 1000,
  };
  return tokenCache.token;
}

export function getFeishuConfiguration() {
  return {
    appId: Boolean(process.env.FEISHU_APP_ID?.trim()),
    appSecret: Boolean(process.env.FEISHU_APP_SECRET?.trim()),
    baseAppToken: Boolean(process.env.FEISHU_BASE_APP_TOKEN?.trim()),
  };
}

export async function listFeishuTables() {
  const token = await getTenantAccessToken();
  const appToken = requiredEnv("FEISHU_BASE_APP_TOKEN");
  const response = await fetch(
    `${FEISHU_API_BASE}/bitable/v1/apps/${encodeURIComponent(appToken)}/tables?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
  const result = (await response.json()) as FeishuTableListResponse;

  if (!response.ok || result.code !== 0) {
    throw new Error(result.msg || "无法读取飞书多维表格");
  }
  return result.data?.items || [];
}
