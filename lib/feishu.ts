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

type FeishuWikiNodeResponse = {
  code?: number;
  msg?: string;
  data?: {
    node?: {
      obj_token?: string;
      obj_type?: string;
      token?: string;
      node_token?: string;
    };
  };
};

let tokenCache: { token: string; expiresAt: number } | null = null;
let wikiTokenCache: { inputToken: string; appToken: string } | null = null;

function requiredEnv(name: "FEISHU_APP_ID" | "FEISHU_APP_SECRET" | "FEISHU_BASE_APP_TOKEN" | "FEISHU_WIKI_TOKEN") {
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
  const baseAppToken = Boolean(process.env.FEISHU_BASE_APP_TOKEN?.trim() || process.env.FEISHU_WIKI_TOKEN?.trim());

  return {
    appId: Boolean(process.env.FEISHU_APP_ID?.trim()),
    appSecret: Boolean(process.env.FEISHU_APP_SECRET?.trim()),
    baseAppToken,
  };
}

async function feishuGet<T>(path: string, token: string) {
  const response = await fetch(
    `${FEISHU_API_BASE}${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
  return {
    ok: response.ok,
    result: (await response.json()) as T,
  };
}

async function tryResolveWikiTokenToBitableAppToken(inputToken: string, token: string) {
  if (wikiTokenCache?.inputToken === inputToken) {
    return wikiTokenCache.appToken;
  }

  const nodeResponse = await feishuGet<FeishuWikiNodeResponse>(
    `/wiki/v2/spaces/get_node?token=${encodeURIComponent(inputToken)}`,
    token,
  );
  const node = nodeResponse.result.data?.node;

  if (!nodeResponse.ok || nodeResponse.result.code !== 0 || !node?.obj_token) {
    return null;
  }

  if (node.obj_type && !["bitable", "base"].includes(node.obj_type)) {
    throw new Error(`该 wiki 节点不是多维表格，而是 ${node.obj_type}`);
  }

  wikiTokenCache = { inputToken, appToken: node.obj_token };
  return node.obj_token;
}

async function getBitableAppToken(token: string) {
  const configuredWikiToken = process.env.FEISHU_WIKI_TOKEN?.trim();

  if (configuredWikiToken) {
    const resolvedToken = await tryResolveWikiTokenToBitableAppToken(configuredWikiToken, token);
    if (!resolvedToken) {
      throw new Error("无法解析 FEISHU_WIKI_TOKEN，请确认飞书应用已开通知识库读取权限，并已被添加为该知识库/多维表格的协作者");
    }
    return resolvedToken;
  }

  const inputToken = requiredEnv("FEISHU_BASE_APP_TOKEN");
  const resolvedToken = await tryResolveWikiTokenToBitableAppToken(inputToken, token);
  return resolvedToken || inputToken;
}

export async function listFeishuTables() {
  const token = await getTenantAccessToken();
  const appToken = await getBitableAppToken(token);
  const { ok, result } = await feishuGet<FeishuTableListResponse>(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables?page_size=100`,
    token,
  );

  if (!ok || result.code !== 0) {
    throw new Error(result.msg || "无法读取飞书多维表格");
  }
  return result.data?.items || [];
}
