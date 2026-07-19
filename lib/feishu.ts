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

export type FeishuRecord = {
  record_id: string;
  fields: Record<string, unknown>;
  created_time?: number;
  last_modified_time?: number;
};

type FeishuRecordListResponse = {
  code?: number;
  msg?: string;
  data?: {
    items?: FeishuRecord[];
    has_more?: boolean;
    page_token?: string;
    total?: number;
  };
};

type FeishuRecordResponse = {
  code?: number;
  msg?: string;
  data?: {
    record?: FeishuRecord;
  };
};

type FeishuFieldListResponse = {
  code?: number;
  msg?: string;
  data?: {
    items?: Array<{
      field_id: string;
      field_name: string;
      type: number;
    }>;
    has_more?: boolean;
    page_token?: string;
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
const fieldNameCache = new Map<string, { names: Set<string>; expiresAt: number }>();

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

async function feishuRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
) {
  const response = await fetch(`${FEISHU_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });
  const text = await response.text();
  const result = (text ? JSON.parse(text) : {}) as T & { code?: number; msg?: string };

  if (!response.ok || (typeof result.code === "number" && result.code !== 0)) {
    const code = typeof result.code === "number" ? `（飞书错误码 ${result.code}）` : "";
    throw new Error(`${result.msg || `飞书接口请求失败，HTTP ${response.status}`}${code}`);
  }
  return result;
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
  const configuredBaseToken = process.env.FEISHU_BASE_APP_TOKEN?.trim();
  if (configuredBaseToken) return configuredBaseToken;

  const configuredWikiToken = process.env.FEISHU_WIKI_TOKEN?.trim();

  if (configuredWikiToken) {
    const resolvedToken = await tryResolveWikiTokenToBitableAppToken(configuredWikiToken, token);
    if (!resolvedToken) {
      throw new Error("无法解析 FEISHU_WIKI_TOKEN，请确认飞书应用已开通知识库读取权限，并已被添加为该知识库/多维表格的协作者");
    }
    return resolvedToken;
  }

  return requiredEnv("FEISHU_BASE_APP_TOKEN");
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

async function getBitableContext() {
  const token = await getTenantAccessToken();
  const appToken = await getBitableAppToken(token);
  return { token, appToken };
}

async function resolveTableId(
  token: string,
  appToken: string,
  envName: string,
  acceptedNames: string[],
) {
  const configured = process.env[envName]?.trim();
  if (configured) return configured;

  const { result, ok } = await feishuGet<FeishuTableListResponse>(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables?page_size=100`,
    token,
  );
  if (!ok || result.code !== 0) {
    throw new Error(result.msg || "无法读取飞书数据表");
  }
  const table = (result.data?.items || []).find((item) => acceptedNames.includes(item.name.trim()));
  if (!table) {
    throw new Error(`没有找到数据表“${acceptedNames[0]}”，请在 Render 配置 ${envName}`);
  }
  return table.table_id;
}

async function listRecordsByTableId(
  token: string,
  appToken: string,
  tableId: string,
) {
  const records: FeishuRecord[] = [];
  let pageToken = "";

  do {
    const query = new URLSearchParams({ page_size: "500" });
    if (pageToken) query.set("page_token", pageToken);
    const result = await feishuRequest<FeishuRecordListResponse>(
      `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records?${query}`,
      token,
    );
    records.push(...(result.data?.items || []));
    pageToken = result.data?.has_more ? result.data.page_token || "" : "";
  } while (pageToken);

  return records;
}

async function getTableFieldNames(token: string, appToken: string, tableId: string) {
  const cacheKey = `${appToken}:${tableId}`;
  const cached = fieldNameCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.names;

  const names = new Set<string>();
  let pageToken = "";
  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (pageToken) query.set("page_token", pageToken);
    const result = await feishuRequest<FeishuFieldListResponse>(
      `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields?${query}`,
      token,
    );
    for (const field of result.data?.items || []) names.add(field.field_name);
    pageToken = result.data?.has_more ? result.data.page_token || "" : "";
  } while (pageToken);

  fieldNameCache.set(cacheKey, { names, expiresAt: Date.now() + 60_000 });
  return names;
}

function readableValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(readableValue).filter(Boolean).join("、");
  }
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    for (const key of ["text", "name", "en_name", "fullPhoneNum", "email", "value", "link"]) {
      const candidate = readableValue(item[key]);
      if (candidate) return candidate;
    }
  }
  return "";
}

function firstReadableField(fields: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = readableValue(fields[name]).trim();
    if (value) return value;
  }
  return "";
}

function relationRecordIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (!item || typeof item !== "object") return [];
    const object = item as Record<string, unknown>;
    if (typeof object.record_id === "string") return [object.record_id];
    if (Array.isArray(object.record_ids)) {
      return object.record_ids.filter((id): id is string => typeof id === "string");
    }
    return [];
  });
}

function dateValue(value: unknown) {
  const formatShanghaiDate = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  if (typeof value === "number") return formatShanghaiDate(new Date(value));
  const text = readableValue(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const timestamp = Number(text);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return formatShanghaiDate(new Date(timestamp));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : formatShanghaiDate(parsed);
}

export type FeishuMeetingInput = {
  title?: string;
  type?: string;
  nature?: string;
  date?: string;
  startTime?: string;
  location?: string;
  noticeDate?: string;
  meetingMode?: string;
  votingMethod?: string;
  expectedAttendance?: number;
  actualAttendance?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  minutesContent?: string;
  minutesUrl?: string;
  status?: string;
  participantNames?: string[];
};

export type FeishuMeeting = {
  id: string;
  title: string;
  type: string;
  nature: string;
  date: string;
  startTime: string;
  location: string;
  noticeDate: string;
  meetingMode: string;
  votingMethod: string;
  expectedAttendance?: number;
  actualAttendance?: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: string;
  participantNames: string[];
  companyName: string;
  entityType: string;
  pendingFields: string[];
  fields: Record<string, unknown>;
};

export type FeishuPersonnel = {
  id: string;
  name: string;
  role: string;
  organization: string;
  status: string;
  phone: string;
  email: string;
  termStart: string;
  termEnd: string;
  isIndependent: boolean;
};

async function personnelDirectory(token: string, appToken: string) {
  const personnelTableId = await resolveTableId(
    token,
    appToken,
    "FEISHU_PERSON_TABLE_ID",
    ["人员表", "人员矩阵"],
  );
  const records = await listRecordsByTableId(token, appToken, personnelTableId);
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const record of records) {
    const name = (
      readableValue(record.fields["姓名文本"]) ||
      readableValue(record.fields["姓名"])
    ).trim();
    if (!name) continue;
    byId.set(record.record_id, name);
    byName.set(name, record.record_id);
  }
  return { byId, byName };
}

export async function listFeishuPersonnel() {
  const { token, appToken } = await getBitableContext();
  const personnelTableId = await resolveTableId(
    token,
    appToken,
    "FEISHU_PERSON_TABLE_ID",
    ["人员表", "人员矩阵"],
  );
  const records = await listRecordsByTableId(token, appToken, personnelTableId);
  return records.flatMap((record): FeishuPersonnel[] => {
    const name = (
      readableValue(record.fields["姓名文本"]) ||
      readableValue(record.fields["姓名"])
    ).trim();
    if (!name) return [];
    const role = readableValue(record.fields["具体职务"]) ||
      readableValue(record.fields["角色"]) ||
      "无";
    const organization = readableValue(record.fields["所属机构"]) ||
      (role.includes("董事") ? "董事会" : role.includes("监事") ? "监事会" : role.includes("股东") ? "股东" : "管理层");
    const independent = readableValue(record.fields["独立性"]).includes("独立") &&
      !readableValue(record.fields["独立性"]).includes("非独立");
    return [{
      id: record.record_id,
      name,
      role,
      organization,
      status: readableValue(record.fields["是否在任"]) || "在任",
      phone: readableValue(record.fields["联系方式"]),
      email: readableValue(record.fields["邮箱"]),
      termStart: dateValue(record.fields["任职开始日期"]) || dateValue(record.fields["任期起止"]),
      termEnd: dateValue(record.fields["任职结束日期"]),
      isIndependent: independent,
    }];
  });
}

function normalizeMeeting(
  record: FeishuRecord,
  personnelNamesById: Map<string, string>,
): FeishuMeeting {
  const linkedIds = relationRecordIds(record.fields["参会人员"]);
  const relationDisplay = linkedIds.map((id) => personnelNamesById.get(id)).filter(Boolean) as string[];
  const contactIds = relationRecordIds(record.fields["会务联系人"]);
  const contactDisplay = contactIds.map((id) => personnelNamesById.get(id)).filter(Boolean) as string[];
  const directDisplay = relationDisplay.length ? [] : readableValue(record.fields["参会人员"])
    .split(/[、,，]/)
    .map((name) => name.trim())
    .filter(Boolean);

  const rawType = readableValue(record.fields["会议类型"]) || "董事会";
  const nature = readableValue(record.fields["会议性质"]) ||
    (readableValue(record.fields["主题"]).includes("临时") ? "临时" : "定期");
  const rawStart = record.fields["会议开始时间"];
  const startDate = dateValue(rawStart);
  const startTime = (() => {
    const timestamp = typeof rawStart === "number" ? rawStart : Number(readableValue(rawStart));
    if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  })();
  const numberValue = (value: unknown) => {
    const number = Number(readableValue(value));
    return Number.isFinite(number) ? number : undefined;
  };

  return {
    id: record.record_id,
    title: readableValue(record.fields["主题"]) || readableValue(record.fields["会议名称"]) || "未命名会议",
    type: rawType === "股东会" && nature === "临时" ? "临时股东会" : rawType,
    nature,
    date: startDate || dateValue(record.fields["时间"]) || new Date().toISOString().slice(0, 10),
    startTime,
    location: readableValue(record.fields["会议地点"]),
    noticeDate: dateValue(record.fields["会议通知日期"]),
    meetingMode: readableValue(record.fields["召开方式"]),
    votingMethod: readableValue(record.fields["表决方式"]),
    expectedAttendance: numberValue(record.fields["应到人数"]),
    actualAttendance: numberValue(record.fields["实到人数"]),
    contactName: contactDisplay.join("、") || readableValue(record.fields["会务联系人"]),
    contactPhone: readableValue(record.fields["会务联系电话"]),
    contactEmail: readableValue(record.fields["会务邮箱"]),
    status: readableValue(record.fields["状态"]) || "筹备中",
    participantNames: relationDisplay.length ? relationDisplay : directDisplay,
    companyName: normalizeCompanyName(
      firstReadableField(record.fields, ["公司名称", "主体名称", "企业名称"]),
      firstReadableField(record.fields, ["公司类型", "主体类型", "企业类型"]),
    ),
    entityType: firstReadableField(record.fields, ["公司类型", "主体类型", "企业类型"]),
    pendingFields: [],
    fields: record.fields,
  };
}

export function normalizeCompanyName(rawName: string, entityType = "") {
  const name = rawName.trim().replace(/[（(]演示[）)]$/, "").trim();
  if (!name) {
    if (!entityType.trim()) return "";
    return entityType.includes("股份") ? "XXX股份有限公司" : "XXX有限公司";
  }
  if (/(股份有限公司|有限责任公司|有限公司)$/.test(name)) return name;
  const isJointStock = entityType.includes("股份") || /股份$/.test(name);
  const stem = name.replace(/股份$/, "").replace(/(?:有限责任)?公司$/, "").trim();
  return `${stem || "XXX"}${isJointStock ? "股份有限公司" : "有限公司"}`;
}

async function getFeishuCompanyProfile(token: string, appToken: string) {
  const fallbackName = process.env.FEISHU_COMPANY_NAME?.trim() || "";
  try {
    const tableId = await resolveTableId(
      token,
      appToken,
      "FEISHU_COMPANY_TABLE_ID",
      ["公司主体表", "公司表", "主体表"],
    );
    const records = await listRecordsByTableId(token, appToken, tableId);
    const record = records[0];
    if (!record) throw new Error("公司主体表为空");
    const entityType = firstReadableField(record.fields, [
      "公司类型",
      "主体类型",
      "企业类型",
      "公司性质",
    ]);
    const rawName = firstReadableField(record.fields, [
      "公司名称",
      "主体名称",
      "企业名称",
      "名称",
    ]);
    return {
      companyName: normalizeCompanyName(rawName || fallbackName, entityType),
      entityType,
    };
  } catch {
    return {
      companyName: normalizeCompanyName(fallbackName),
      entityType: "",
    };
  }
}

async function meetingFields(
  input: FeishuMeetingInput,
  token: string,
  appToken: string,
  tableId: string,
) {
  const availableFields = await getTableFieldNames(token, appToken, tableId);
  const fields: Record<string, unknown> = {};
  const pendingFields: string[] = [];
  const put = (name: string, value: unknown, optional = false) => {
    if (value === undefined) return;
    if (availableFields.has(name)) {
      fields[name] = value;
    } else if (optional) {
      pendingFields.push(name);
    } else {
      throw new Error(`会议表缺少必要字段“${name}”`);
    }
  };

  put("主题", input.title);
  if (input.type !== undefined) {
    put("会议类型", input.type === "临时股东会" ? "股东会" : input.type);
    const nature = input.nature || (input.type === "临时股东会" ? "临时" : "定期");
    put("会议性质", nature, true);
  } else {
    put("会议性质", input.nature, true);
  }
  put("状态", input.status);
  if (input.date !== undefined) {
    const date = new Date(`${input.date}T00:00:00+08:00`);
    if (Number.isNaN(date.getTime())) throw new Error("会议日期格式无效");
    put("时间", date.getTime());

    if (input.startTime) {
      const start = new Date(`${input.date}T${input.startTime}:00+08:00`);
      if (Number.isNaN(start.getTime())) throw new Error("会议开始时间格式无效");
      put("会议开始时间", start.getTime(), true);
    }
  }
  put("会议地点", input.location, true);
  if (input.noticeDate !== undefined) {
    const noticeDate = new Date(`${input.noticeDate}T00:00:00+08:00`);
    if (Number.isNaN(noticeDate.getTime())) throw new Error("会议通知日期格式无效");
    put("会议通知日期", noticeDate.getTime(), true);
  }
  put("召开方式", input.meetingMode, true);
  put("表决方式", input.votingMethod, true);
  put("应到人数", input.expectedAttendance, true);
  put("实到人数", input.actualAttendance, true);
  put("会务联系电话", input.contactPhone, true);
  put("会务邮箱", input.contactEmail, true);
  put("会议纪要正文", input.minutesContent, true);
  put("妙记链接", input.minutesUrl, true);

  const namesToRecordIds = async (names: string[]) => {
    const directory = await personnelDirectory(token, appToken);
    const missing: string[] = [];
    const recordIds = names.flatMap((name) => {
      const recordId = directory.byName.get(name.trim());
      if (!recordId) {
        missing.push(name);
        return [];
      }
      return [recordId];
    });
    if (missing.length) throw new Error(`人员表中没有找到：${missing.join("、")}`);
    return recordIds;
  };

  if (input.participantNames !== undefined) {
    put("参会人员", await namesToRecordIds(input.participantNames));
  }
  if (input.contactName !== undefined) {
    if (availableFields.has("会务联系人")) {
      put("会务联系人", input.contactName ? await namesToRecordIds([input.contactName]) : []);
    } else {
      pendingFields.push("会务联系人");
    }
  }
  return { fields, pendingFields: [...new Set(pendingFields)] };
}

export async function listFeishuMeetings() {
  const { token, appToken } = await getBitableContext();
  const tableId = await resolveTableId(token, appToken, "FEISHU_MEETING_TABLE_ID", ["会议表"]);
  const records = await listRecordsByTableId(token, appToken, tableId);
  let namesById = new Map<string, string>();
  try {
    namesById = (await personnelDirectory(token, appToken)).byId;
  } catch {
    // 人员表尚未完成时，会议核心字段仍然可以正常读取。
  }
  const company = await getFeishuCompanyProfile(token, appToken);
  return records.map((record) => {
    const meeting = normalizeMeeting(record, namesById);
    meeting.companyName = meeting.companyName || company.companyName;
    meeting.entityType = meeting.entityType || company.entityType;
    return meeting;
  });
}

export async function getFeishuMeeting(recordId: string) {
  const { token, appToken } = await getBitableContext();
  const tableId = await resolveTableId(token, appToken, "FEISHU_MEETING_TABLE_ID", ["会议表"]);
  const result = await feishuRequest<FeishuRecordResponse>(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`,
    token,
  );
  if (!result.data?.record) throw new Error("飞书没有返回该会议记录");
  let namesById = new Map<string, string>();
  try {
    namesById = (await personnelDirectory(token, appToken)).byId;
  } catch {
    // 同上，人员关联失败不阻断会议基础信息。
  }
  const meeting = normalizeMeeting(result.data.record, namesById);
  const company = await getFeishuCompanyProfile(token, appToken);
  meeting.companyName = meeting.companyName || company.companyName;
  meeting.entityType = meeting.entityType || company.entityType;
  return meeting;
}

export async function createFeishuMeeting(input: FeishuMeetingInput) {
  const { token, appToken } = await getBitableContext();
  const tableId = await resolveTableId(token, appToken, "FEISHU_MEETING_TABLE_ID", ["会议表"]);
  const { fields, pendingFields } = await meetingFields(input, token, appToken, tableId);
  const result = await feishuRequest<FeishuRecordResponse>(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records`,
    token,
    { method: "POST", body: JSON.stringify({ fields }) },
  );
  if (!result.data?.record) throw new Error("飞书没有返回新建的会议记录");
  const meeting = await getFeishuMeeting(result.data.record.record_id);
  meeting.pendingFields = pendingFields;
  return meeting;
}

export async function updateFeishuMeeting(recordId: string, input: FeishuMeetingInput) {
  const { token, appToken } = await getBitableContext();
  const tableId = await resolveTableId(token, appToken, "FEISHU_MEETING_TABLE_ID", ["会议表"]);
  const { fields, pendingFields } = await meetingFields(input, token, appToken, tableId);
  await feishuRequest<FeishuRecordResponse>(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`,
    token,
    { method: "PUT", body: JSON.stringify({ fields }) },
  );
  const meeting = await getFeishuMeeting(recordId);
  meeting.pendingFields = pendingFields;
  return meeting;
}

export async function deleteFeishuMeeting(recordId: string) {
  const { token, appToken } = await getBitableContext();
  const tableId = await resolveTableId(token, appToken, "FEISHU_MEETING_TABLE_ID", ["会议表"]);
  await feishuRequest(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`,
    token,
    { method: "DELETE" },
  );
}

export type FeishuMeetingSourceBundle = {
  meeting: FeishuMeeting;
  minutes: {
    source: "feishu_minutes" | "meeting_table" | "missing";
    url: string;
    token: string;
    title: string;
    duration?: number;
    ownerId: string;
    content: string;
    metadataStatus: "loaded" | "not_configured" | "unavailable";
    metadataMessage?: string;
  };
  proposals: FeishuVotingProposal[];
  missingFields: string[];
};

function extractMinuteToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const urlMatch = trimmed.match(/\/minutes\/obcn([A-Za-z0-9_-]{20,})/i);
  if (urlMatch) return `obcn${urlMatch[1]}`;
  const plainMatch = trimmed.match(/\b(obcn[A-Za-z0-9_-]{20,})\b/i);
  return plainMatch?.[1] || (/^[A-Za-z0-9_-]{24}$/.test(trimmed) ? trimmed : "");
}

export async function getFeishuMeetingSourceBundle(
  meetingId: string,
): Promise<FeishuMeetingSourceBundle> {
  const meeting = await getFeishuMeeting(meetingId);
  const { token } = await getBitableContext();
  const minutesUrl = firstReadableField(meeting.fields, [
    "妙记链接",
    "飞书妙记链接",
    "妙记 URL",
    "妙记",
    "妙记Token",
    "妙记 Token",
  ]);
  const minuteToken = extractMinuteToken(minutesUrl);
  const minutesContent = firstReadableField(meeting.fields, [
    "会议纪要正文",
    "妙记逐字稿",
    "妙记纪要",
    "逐字稿",
    "会议纪要",
  ]);
  const minutes: FeishuMeetingSourceBundle["minutes"] = {
    source: minuteToken ? "feishu_minutes" : minutesContent ? "meeting_table" : "missing",
    url: minutesUrl,
    token: minuteToken,
    title: meeting.title,
    ownerId: "",
    content: minutesContent,
    metadataStatus: minuteToken ? "unavailable" : "not_configured",
  };

  if (minuteToken) {
    try {
      const result = await feishuRequest<{
        data?: {
          minute?: {
            title?: string;
            duration?: number;
            owner_id?: string;
            url?: string;
          };
        };
      }>(`/minutes/v1/minutes/${encodeURIComponent(minuteToken)}`, token);
      const minute = result.data?.minute;
      minutes.title = minute?.title || meeting.title;
      minutes.duration = minute?.duration;
      minutes.ownerId = minute?.owner_id || "";
      minutes.url = minute?.url || minutesUrl;
      minutes.metadataStatus = "loaded";
    } catch (error) {
      minutes.metadataMessage = error instanceof Error ? error.message : "妙记信息读取失败";
    }
  }

  let proposals: FeishuVotingProposal[] = [];
  try {
    proposals = (await getFeishuVotingContext(meetingId)).proposals;
  } catch {
    // 议案表尚未配置时，会议纪要仍可独立使用。
  }

  const missingFields: string[] = [];
  if (!minutesUrl) missingFields.push("妙记链接");
  if (!minutesContent) missingFields.push("会议纪要正文或妙记逐字稿");
  if (!proposals.length) missingFields.push("关联议案");

  return { meeting, minutes, proposals, missingFields };
}

export type GeneratedProposalInput = {
  title: string;
  content: string;
  legalBasis?: string;
  recommendation?: string;
  type?: string;
};

export async function createFeishuProposals(
  meetingId: string,
  proposals: GeneratedProposalInput[],
) {
  if (!meetingId || !proposals.length) throw new Error("会议和议案内容不能为空");
  const { token, appToken } = await getBitableContext();
  const tableId = await resolveTableId(token, appToken, "FEISHU_PROPOSAL_TABLE_ID", ["议案表"]);
  const availableFields = await getTableFieldNames(token, appToken, tableId);
  const records: Array<{ recordId: string; title: string }> = [];
  const batchCode = String(Date.now()).slice(-6);

  for (let index = 0; index < proposals.length; index += 1) {
    const proposal = proposals[index];
    const fields: Record<string, unknown> = {};
    const putAny = (names: string[], value: unknown) => {
      const name = names.find((candidate) => availableFields.has(candidate));
      if (name && value !== undefined && value !== "") fields[name] = value;
    };
    putAny(["议案标题", "议案名称", "名称"], proposal.title);
    putAny(["议案编号"], `YA-${new Date().getFullYear()}-${batchCode}-${String(index + 1).padStart(2, "0")}`);
    putAny(["关联会议"], [meetingId]);
    putAny(["议案正文", "议案内容"], proposal.content);
    putAny(["适用规则", "法律依据"], proposal.legalBasis);
    putAny(["审查建议", "决策建议"], proposal.recommendation);
    putAny(["议案类型"], proposal.type);
    putAny(["审议状态", "状态"], "待审议");
    const result = await feishuRequest<FeishuRecordResponse>(
      `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records`,
      token,
      { method: "POST", body: JSON.stringify({ fields }) },
    );
    if (result.data?.record) {
      records.push({ recordId: result.data.record.record_id, title: proposal.title });
    }
  }
  return records;
}

export type FeishuVotingShareholder = {
  id: string;
  name: string;
  shares: string;
  shareholding: string;
  votingRights: string;
};

export type FeishuVotingProposal = {
  id: string;
  number: string;
  title: string;
  content: string;
};

export type FeishuVotingContext = {
  meeting: {
    id: string;
    title: string;
    date: string;
    type: string;
  };
  shareholders: FeishuVotingShareholder[];
  proposals: FeishuVotingProposal[];
  pendingFields: string[];
};

async function getRecordById(
  token: string,
  appToken: string,
  tableId: string,
  recordId: string,
) {
  const result = await feishuRequest<FeishuRecordResponse>(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`,
    token,
  );
  if (!result.data?.record) throw new Error("飞书没有返回指定记录");
  return result.data.record;
}

export async function getFeishuVotingContext(meetingId: string): Promise<FeishuVotingContext> {
  if (!meetingId?.trim()) throw new Error("会议编号不能为空");
  const { token, appToken } = await getBitableContext();
  const meetingTableId = await resolveTableId(
    token,
    appToken,
    "FEISHU_MEETING_TABLE_ID",
    ["会议表"],
  );
  const shareholderTableId = await resolveTableId(
    token,
    appToken,
    "FEISHU_SHAREHOLDER_TABLE_ID",
    ["股东表"],
  );
  const proposalTableId = await resolveTableId(
    token,
    appToken,
    "FEISHU_PROPOSAL_TABLE_ID",
    ["议案表"],
  );

  const [meetingRecord, shareholderRecords, proposalRecords, shareholderFields, proposalFields] =
    await Promise.all([
      getRecordById(token, appToken, meetingTableId, meetingId),
      listRecordsByTableId(token, appToken, shareholderTableId),
      listRecordsByTableId(token, appToken, proposalTableId),
      getTableFieldNames(token, appToken, shareholderTableId),
      getTableFieldNames(token, appToken, proposalTableId),
    ]);

  const participantShareholderIds = new Set(
    relationRecordIds(meetingRecord.fields["参会股东"]),
  );
  const applicableShareholders = participantShareholderIds.size
    ? shareholderRecords.filter((record) => participantShareholderIds.has(record.record_id))
    : shareholderRecords;

  const shareholders = applicableShareholders
    .map((record) => ({
      id: record.record_id,
      name: readableValue(
        record.fields["股东名称"] ?? record.fields["股东姓名"] ?? record.fields["名称"],
      ),
      shares: readableValue(
        record.fields["持股数量"] ?? record.fields["持股数"] ?? record.fields["股份数量"],
      ),
      shareholding: readableValue(record.fields["持股比例"]),
      votingRights: readableValue(
        record.fields["表决权数量"] ??
          record.fields["票权数"] ??
          record.fields["持股数量"] ??
          record.fields["持股数"],
      ),
    }))
    .filter((shareholder) => shareholder.name)
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

  const proposals = proposalRecords
    .filter((record) => relationRecordIds(record.fields["关联会议"]).includes(meetingId))
    .map((record) => ({
      id: record.record_id,
      number: readableValue(record.fields["议案编号"]),
      title: readableValue(
        record.fields["议案标题"] ?? record.fields["议案名称"] ?? record.fields["名称"],
      ),
      content: readableValue(record.fields["议案正文"] ?? record.fields["议案内容"]),
    }))
    .filter((proposal) => proposal.title);

  const pendingFields: string[] = [];
  if (![...shareholderFields].some((name) => ["持股数量", "持股数", "股份数量"].includes(name))) {
    pendingFields.push("股东表.持股数量");
  }
  if (![...proposalFields].some((name) => ["议案正文", "议案内容"].includes(name))) {
    pendingFields.push("议案表.议案正文");
  }

  return {
    meeting: {
      id: meetingRecord.record_id,
      title:
        readableValue(meetingRecord.fields["主题"]) ||
        readableValue(meetingRecord.fields["会议标题"]) ||
        readableValue(meetingRecord.fields["会议名称"]),
      date:
        dateValue(meetingRecord.fields["会议开始时间"]) ||
        dateValue(meetingRecord.fields["时间"]) ||
        dateValue(meetingRecord.fields["会议日期"]) ||
        dateValue(meetingRecord.fields["会议时间"]),
      type: readableValue(meetingRecord.fields["会议类型"]),
    },
    shareholders,
    proposals,
    pendingFields,
  };
}

export type FeishuVotingDocumentInput = {
  meetingId: string;
  shareholderId: string;
  shareholderName: string;
  proposalId?: string;
  proposalTitle?: string;
  title: string;
  content: string;
};

export type FeishuReviewDocument = {
  recordId: string;
  title: string;
  content: string;
  meetingId: string;
  attachment?: {
    fileToken: string;
    fileName: string;
  };
  fields: Record<string, unknown>;
};

function collectAttachments(value: unknown): Array<{ fileToken: string; fileName: string }> {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(collectAttachments);
  if (typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  const fileToken =
    typeof object.file_token === "string"
      ? object.file_token
      : typeof object.fileToken === "string"
        ? object.fileToken
        : "";
  const fileName =
    typeof object.name === "string"
      ? object.name
      : typeof object.file_name === "string"
        ? object.file_name
        : "飞书文书.docx";
  const own = fileToken ? [{ fileToken, fileName }] : [];
  return own.concat(Object.values(object).flatMap(collectAttachments));
}

export async function getFeishuDocumentForReview(
  recordId: string,
): Promise<FeishuReviewDocument> {
  if (!recordId.trim()) throw new Error("缺少飞书文书记录 ID");
  const { token, appToken } = await getBitableContext();
  const tableId = await resolveTableId(
    token,
    appToken,
    "FEISHU_DOCUMENT_TABLE_ID",
    ["文书表"],
  );
  const result = await feishuRequest<FeishuRecordResponse>(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId.trim())}`,
    token,
  );
  const record = result.data?.record;
  if (!record) throw new Error("飞书没有返回该文书记录");

  const preferredAttachmentFields = ["文书附件", "附件", "文书文件", "文件", "Word文件"];
  let attachments = preferredAttachmentFields.flatMap((name) =>
    collectAttachments(record.fields[name]),
  );
  if (!attachments.length) {
    attachments = Object.values(record.fields).flatMap(collectAttachments);
  }

  return {
    recordId: record.record_id,
    title:
      firstReadableField(record.fields, ["文书名称", "文件名称", "标题", "名称"]) ||
      attachments[0]?.fileName ||
      "飞书文书",
    content: firstReadableField(record.fields, [
      "文书正文",
      "文件正文",
      "审查正文",
      "会议纪要正文",
      "会议纪要",
    ]),
    meetingId: relationRecordIds(record.fields["关联会议"])[0] || "",
    attachment: attachments[0],
    fields: record.fields,
  };
}

export async function downloadFeishuBitableAttachment(fileToken: string) {
  if (!fileToken.trim()) throw new Error("飞书附件缺少 file_token");
  const token = await getTenantAccessToken();
  const response = await fetch(
    `${FEISHU_API_BASE}/drive/v1/medias/${encodeURIComponent(fileToken.trim())}/download`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    let message = `飞书附件下载失败，HTTP ${response.status}`;
    try {
      const error = (await response.json()) as { msg?: string; code?: number };
      message = `${error.msg || message}${error.code ? `（飞书错误码 ${error.code}）` : ""}`;
    } catch {
      // 二进制下载失败时响应不一定是 JSON。
    }
    throw new Error(message);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 25 * 1024 * 1024) {
    throw new Error("飞书附件超过 25MB，暂不支持自动审查");
  }
  return {
    buffer,
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}

export async function updateFeishuDocumentReview(
  recordId: string,
  input: {
    status: "审查中" | "审查完成" | "审查失败";
    score?: number;
    riskLevel?: string;
    report?: string;
    riskSummary?: string;
    missingItems?: string[];
    errorMessage?: string;
  },
) {
  const { token, appToken } = await getBitableContext();
  const tableId = await resolveTableId(
    token,
    appToken,
    "FEISHU_DOCUMENT_TABLE_ID",
    ["文书表"],
  );
  const availableFields = await getTableFieldNames(token, appToken, tableId);
  const fields: Record<string, unknown> = {};
  const put = (name: string, value: unknown) => {
    if (availableFields.has(name)) fields[name] = value;
  };

  put("审查状态", input.status);
  if (typeof input.score === "number") put("审查分数", input.score);
  if (input.riskLevel) put("风险等级", input.riskLevel);
  if (input.report) put("审查报告", input.report.slice(0, 100_000));
  if (input.riskSummary) put("风险摘要", input.riskSummary.slice(0, 20_000));
  if (input.missingItems) put("缺失材料", input.missingItems.join("\n").slice(0, 20_000));
  if (input.errorMessage) put("审查错误", input.errorMessage.slice(0, 5_000));
  put("审查时间", Date.now());

  if (!Object.keys(fields).length) {
    throw new Error("文书表尚未创建审查字段，至少需要“审查状态”字段");
  }

  await feishuRequest<FeishuRecordResponse>(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId.trim())}`,
    token,
    { method: "PUT", body: JSON.stringify({ fields }) },
  );

  return {
    updatedFields: Object.keys(fields),
    missingRecommendedFields: [
      "审查状态",
      "审查分数",
      "风险等级",
      "审查报告",
      "风险摘要",
      "缺失材料",
      "审查时间",
      "审查错误",
    ].filter((name) => !availableFields.has(name)),
  };
}

export async function createFeishuVotingDocument(input: FeishuVotingDocumentInput) {
  if (!input.meetingId || !input.shareholderId || !input.title.trim() || !input.content.trim()) {
    throw new Error("会议、股东、文书名称和文书正文不能为空");
  }
  const { token, appToken } = await getBitableContext();
  const tableId = await resolveTableId(
    token,
    appToken,
    "FEISHU_DOCUMENT_TABLE_ID",
    ["文书表"],
  );
  const availableFields = await getTableFieldNames(token, appToken, tableId);
  const fields: Record<string, unknown> = {};
  const pendingFields: string[] = [];
  const put = (name: string, value: unknown, required = false) => {
    if (availableFields.has(name)) fields[name] = value;
    else if (required) pendingFields.push(`文书表.${name}`);
  };

  put("文书名称", input.title, true);
  // 现有飞书表的选项中包含“其他文书”，可以兼容尚未新增“表决票”选项的 Base。
  put("文书类型", "其他文书");
  put("文书正文", input.content, true);
  put("关联会议", [input.meetingId], true);
  put("关联议案", input.proposalId ? [input.proposalId] : [], Boolean(input.proposalId));
  put("关联股东", [input.shareholderId], true);
  put("生成状态", "已生成");
  put(
    "生成备注",
    `空白表决票；股东：${input.shareholderName}；议案：${input.proposalTitle || "未指定"}。本记录不代表已经投票。`,
  );

  const result = await feishuRequest<FeishuRecordResponse>(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records`,
    token,
    { method: "POST", body: JSON.stringify({ fields }) },
  );
  if (!result.data?.record) throw new Error("飞书没有返回新建的文书记录");
  return {
    recordId: result.data.record.record_id,
    pendingFields: [...new Set(pendingFields)],
  };
}

export type FeishuVoteInput = {
  meetingId: string;
  proposalId: string;
  shareholderId: string;
  opinion: "同意" | "反对" | "弃权";
  votingRights?: string;
};

export async function submitFeishuVote(input: FeishuVoteInput) {
  if (!input.meetingId || !input.proposalId || !input.shareholderId) {
    throw new Error("会议、议案和投票股东不能为空");
  }
  if (!["同意", "反对", "弃权"].includes(input.opinion)) {
    throw new Error("表决意见只能是同意、反对或弃权");
  }

  const { token, appToken } = await getBitableContext();
  const tableId = await resolveTableId(
    token,
    appToken,
    "FEISHU_VOTE_TABLE_ID",
    ["表决表"],
  );
  const [availableFields, records] = await Promise.all([
    getTableFieldNames(token, appToken, tableId),
    listRecordsByTableId(token, appToken, tableId),
  ]);
  const fields: Record<string, unknown> = {};
  const pendingFields: string[] = [];
  const put = (name: string, value: unknown, required = false) => {
    if (availableFields.has(name)) fields[name] = value;
    else if (required) pendingFields.push(`表决表.${name}`);
  };

  put("关联会议", [input.meetingId], true);
  put("关联议案", [input.proposalId], true);
  put("投票股东", [input.shareholderId], true);
  put("表决意见", input.opinion, true);
  put("是否回避", false);
  put("表决时间", Date.now());
  if (input.votingRights) put("票权数", Number(input.votingRights) || input.votingRights);
  put("有效性", "有效");
  put("计票状态", "已计票");

  const existing = records.find((record) =>
    relationRecordIds(record.fields["关联会议"]).includes(input.meetingId) &&
    relationRecordIds(record.fields["关联议案"]).includes(input.proposalId) &&
    relationRecordIds(record.fields["投票股东"]).includes(input.shareholderId),
  );
  const path = `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records${existing ? `/${encodeURIComponent(existing.record_id)}` : ""}`;
  const result = await feishuRequest<FeishuRecordResponse>(path, token, {
    method: existing ? "PUT" : "POST",
    body: JSON.stringify({ fields }),
  });
  if (!result.data?.record) throw new Error("飞书没有返回表决记录");
  return {
    recordId: result.data.record.record_id,
    action: existing ? "updated" as const : "created" as const,
    pendingFields: [...new Set(pendingFields)],
  };
}
