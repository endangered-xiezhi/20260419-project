export type MeetingPackageType = "shareholder" | "board" | "supervisor";

export type DocumentJob = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  archiveStatus: "pending" | "archived" | "not_configured" | "failed";
  progress: number;
  message: string;
  attempt: number;
  error?: string;
  output?: {
    fileCount: number;
    documentNames: string[];
    folderUrl?: string;
    archivedToFeishu: boolean;
    downloadUrl: string;
  };
};

export type MeetingPackageResponse = {
  success: true;
  jobId: string;
  meetingId: string | null;
  meetingType: MeetingPackageType;
  fileCount: number;
  documentNames: string[];
  folderUrl: string | null;
  archivedToFeishu: boolean;
  downloadUrl: string;
};

async function jsonRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const result = await response.json() as T & { success?: boolean; error?: string };
  if (!response.ok || result.success === false) {
    throw new Error(result.error || `请求失败（HTTP ${response.status}）`);
  }
  return result;
}

export async function getDocumentJob(jobId: string) {
  return jsonRequest<{ success: true; job: DocumentJob }>(
    `/api/document-jobs/${encodeURIComponent(jobId)}`,
  );
}

export async function listDocumentJobs(meetingId?: string) {
  const query = meetingId ? `?meetingId=${encodeURIComponent(meetingId)}` : "";
  return jsonRequest<{ success: true; jobs: DocumentJob[] }>(`/api/document-jobs${query}`);
}

export async function retryDocumentJob(jobId: string) {
  return jsonRequest<{ success: true; job: DocumentJob }>(
    `/api/document-jobs/${encodeURIComponent(jobId)}/retry`,
    { method: "POST", body: "{}" },
  );
}

export async function waitForDocumentJob(
  initialJob: DocumentJob,
  onProgress?: (job: DocumentJob) => void,
) {
  let job = initialJob;
  onProgress?.(job);
  for (let attempt = 0; attempt < 600; attempt += 1) {
    if (job.status === "succeeded") return job;
    if (job.status === "failed") throw new Error(job.error || job.message || "生成会议档案失败");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    job = (await getDocumentJob(job.id)).job;
    onProgress?.(job);
  }
  throw new Error("生成任务等待超时，可稍后在文书中心查看任务状态");
}

export async function requestMeetingPackage(input: {
  meetingId?: string;
  meetingTitle: string;
  meetingType: MeetingPackageType;
  values?: Record<string, string | number | boolean | null | undefined>;
  onProgress?: (job: DocumentJob) => void;
}) {
  const { onProgress, ...payload } = input;
  const result = await jsonRequest<{
    success: true;
    created: boolean;
    job: DocumentJob;
  }>("/api/document-jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const job = await waitForDocumentJob(result.job, onProgress);
  if (!job.output) throw new Error("任务完成但未返回文书文件");
  return {
    success: true,
    jobId: job.id,
    meetingId: input.meetingId || null,
    meetingType: input.meetingType,
    fileCount: job.output.fileCount,
    documentNames: job.output.documentNames,
    folderUrl: job.output.folderUrl || null,
    archivedToFeishu: job.output.archivedToFeishu,
    downloadUrl: job.output.downloadUrl,
  } satisfies MeetingPackageResponse;
}

export function downloadMeetingPackage(downloadUrl: string) {
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
