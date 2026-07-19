export type MeetingPackageType = "shareholder" | "board" | "supervisor";

export type MeetingPackageResponse = {
  success: true;
  meetingId: string | null;
  meetingType: MeetingPackageType;
  fileCount: number;
  documentNames: string[];
  folderUrl: string | null;
  archivedToFeishu: boolean;
  downloadUrl: string;
};

export async function requestMeetingPackage(input: {
  meetingId?: string;
  meetingTitle: string;
  meetingType: MeetingPackageType;
  values?: Record<string, string | number | boolean | null | undefined>;
}) {
  const response = await fetch("/api/meetings/package", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json() as MeetingPackageResponse | { success: false; error?: string };

  if (!response.ok || !result.success) {
    throw new Error("error" in result && result.error ? result.error : "生成会议档案失败");
  }
  return result;
}

export function downloadMeetingPackage(downloadUrl: string) {
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

