import type { Meeting, MeetingType } from "../types";
import type { Personnel } from "../types";

export type ApiMeeting = {
  id: string;
  title: string;
  type: string;
  date: string;
  nature?: string;
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
  status: string;
  participantNames?: string[];
  companyName?: string;
  entityType?: string;
  pendingFields?: string[];
};

type MeetingWriteInput = {
  title?: string;
  type?: MeetingType;
  date?: string;
  nature?: string;
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
  status?: Meeting["status"];
  participantNames?: string[];
};

async function apiRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const responseText = await response.text();
  let result: T & { success?: boolean; error?: string };
  try {
    result = JSON.parse(responseText) as T & { success?: boolean; error?: string };
  } catch {
    throw new Error(
      responseText.trim().startsWith("<!doctype")
        ? "Render 尚未部署最新会议接口"
        : `服务器返回了无法识别的数据（HTTP ${response.status}）`,
    );
  }
  if (!response.ok || result.success === false) {
    throw new Error(result.error || "飞书同步失败");
  }
  return result;
}

export function toFrontendMeeting(
  meeting: ApiMeeting,
  personnelIdByName: Map<string, string>,
): Meeting {
  const allowedTypes: MeetingType[] = ["股东会", "董事会", "监事会", "临时股东会"];
  const type = allowedTypes.includes(meeting.type as MeetingType)
    ? meeting.type as MeetingType
    : meeting.type.includes("股东")
      ? "股东会"
      : meeting.type.includes("监事")
        ? "监事会"
        : "董事会";
  const allowedStatuses: Meeting["status"][] = ["筹备中", "进行中", "已结束"];
  const status = allowedStatuses.includes(meeting.status as Meeting["status"])
    ? meeting.status as Meeting["status"]
    : "筹备中";

  return {
    id: meeting.id,
    title: meeting.title,
    type,
    date: meeting.date,
    status,
    complianceScore: 100,
    notifiedDays: 0,
    participants: (meeting.participantNames || [])
      .map((name) => personnelIdByName.get(name))
      .filter((id): id is string => Boolean(id)),
    threshold: "",
    nature: meeting.nature === "临时" ? "临时" : "定期",
    startTime: meeting.startTime || "",
    location: meeting.location || "",
    noticeDate: meeting.noticeDate || "",
    meetingMode: meeting.meetingMode as Meeting["meetingMode"],
    votingMethod: meeting.votingMethod as Meeting["votingMethod"],
    expectedAttendance: meeting.expectedAttendance,
    actualAttendance: meeting.actualAttendance,
    contactName: meeting.contactName || "",
    contactPhone: meeting.contactPhone || "",
    contactEmail: meeting.contactEmail || "",
  };
}

export async function listMeetingsFromFeishu() {
  return apiRequest<{ success: true; meetings: ApiMeeting[]; syncedAt: string }>(
    "/api/feishu/meetings",
  );
}

export async function listPersonnelFromFeishu() {
  return apiRequest<{
    success: true;
    personnel: Array<{
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
    }>;
    syncedAt: string;
  }>("/api/feishu/personnel").then((result) => ({
    ...result,
    personnel: result.personnel.map((person) => ({
      ...person,
      role: person.role as Personnel["role"],
      organization: person.organization as Personnel["organization"],
      status: person.status === "离任" ? "离职" : "在职",
    } satisfies Personnel)),
  }));
}

export async function getMeetingFromFeishu(id: string) {
  return apiRequest<{ success: true; meeting: ApiMeeting }>(
    `/api/feishu/meetings/${encodeURIComponent(id)}`,
  );
}

export async function createMeetingInFeishu(input: MeetingWriteInput) {
  return apiRequest<{ success: true; meeting: ApiMeeting }>("/api/feishu/meetings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMeetingInFeishu(id: string, input: MeetingWriteInput) {
  return apiRequest<{ success: true; meeting: ApiMeeting }>(
    `/api/feishu/meetings/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteMeetingFromFeishu(id: string) {
  return apiRequest<{ success: true }>(
    `/api/feishu/meetings/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export type FeishuMeetingSourceBundle = {
  meeting: ApiMeeting & { fields?: Record<string, unknown> };
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
  proposals: Array<{ id: string; number: string; title: string; content: string }>;
  missingFields: string[];
};

export async function getMeetingSourceBundle(id: string) {
  return apiRequest<{ success: true; bundle: FeishuMeetingSourceBundle; syncedAt: string }>(
    `/api/feishu/meetings/${encodeURIComponent(id)}/source-bundle`,
  );
}

export async function generateMeetingProposals(id: string, count = 3) {
  return apiRequest<{
    success: true;
    mode: "ai" | "demo";
    proposals: Array<{
      title: string;
      type?: string;
      content: string;
      legalBasis?: string;
      recommendation?: string;
    }>;
    created: Array<{ recordId: string; title: string }>;
  }>(`/api/feishu/meetings/${encodeURIComponent(id)}/proposals/generate`, {
    method: "POST",
    body: JSON.stringify({ count }),
  });
}
