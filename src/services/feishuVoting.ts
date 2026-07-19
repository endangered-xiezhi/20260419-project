export type VotingShareholder = {
  id: string;
  name: string;
  shares: string;
  shareholding: string;
  votingRights: string;
};

export type VotingProposal = {
  id: string;
  number: string;
  title: string;
  content: string;
};

export type VotingContext = {
  meeting: {
    id: string;
    title: string;
    date: string;
    type: string;
  };
  shareholders: VotingShareholder[];
  proposals: VotingProposal[];
  pendingFields: string[];
};

async function apiRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const text = await response.text();
  let result: T & { success?: boolean; error?: string };
  try {
    result = JSON.parse(text) as T & { success?: boolean; error?: string };
  } catch {
    throw new Error("服务器没有返回可识别的数据，请确认 Render 已完成最新部署");
  }
  if (!response.ok || result.success === false) {
    throw new Error(result.error || "飞书数据操作失败");
  }
  return result;
}

export function getVotingContext(meetingId: string) {
  return apiRequest<{ success: true; context: VotingContext; syncedAt: string }>(
    `/api/feishu/meetings/${encodeURIComponent(meetingId)}/voting-context`,
  );
}

export function createVotingDocument(input: {
  meetingId: string;
  shareholderId: string;
  shareholderName: string;
  proposalId?: string;
  proposalTitle?: string;
  title: string;
  content: string;
}) {
  return apiRequest<{
    success: true;
    document: { recordId: string; pendingFields: string[] };
  }>("/api/feishu/documents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function submitVotingOpinion(input: {
  meetingId: string;
  proposalId: string;
  shareholderId: string;
  opinion: "同意" | "反对" | "弃权";
  votingRights?: string;
}) {
  return apiRequest<{
    success: true;
    vote: {
      recordId: string;
      action: "created" | "updated";
      pendingFields: string[];
    };
  }>("/api/feishu/votes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
