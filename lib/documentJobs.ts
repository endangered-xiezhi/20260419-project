import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { MeetingPackageType } from "./meetingPackage.js";

export type DocumentJobStatus = "queued" | "running" | "succeeded" | "failed";
export type ArchiveStatus = "pending" | "archived" | "not_configured" | "failed";

export type DocumentJobInput = {
  meetingId?: string;
  meetingTitle: string;
  meetingType: MeetingPackageType;
  values?: Record<string, string | number | boolean | null>;
  requestedBy?: string;
};

export type DocumentJob = {
  id: string;
  idempotencyKey: string;
  input: DocumentJobInput;
  status: DocumentJobStatus;
  archiveStatus: ArchiveStatus;
  progress: number;
  message: string;
  attempt: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  feishuJobRecordId?: string;
  output?: {
    fileCount: number;
    documentNames: string[];
    downloadUrl: string;
    folderUrl?: string;
    folderToken?: string;
    archivedToFeishu: boolean;
    documentRecordIds?: string[];
    archivedDocuments?: Array<{
      fileName: string;
      fileToken: string;
      recordId?: string;
    }>;
    zipFileToken?: string;
  };
};

type JobFile = { version: 1; jobs: DocumentJob[] };

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)]),
  );
}

export function documentJobKey(input: DocumentJobInput, templateVersion: string) {
  const { requestedBy: _requestedBy, ...businessInput } = input;
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableValue({ input: businessInput, templateVersion })))
    .digest("hex");
}

export class DocumentJobStore {
  private jobs = new Map<string, DocumentJob>();
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async initialize() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, "utf8")) as JobFile;
      for (const job of parsed.jobs || []) {
        // A process restart interrupted these jobs. Mark them retryable instead of
        // leaving the UI polling forever.
        if (job.status === "running" || job.status === "queued") {
          job.status = "failed";
          job.archiveStatus = job.archiveStatus === "archived" ? "archived" : "failed";
          job.error = "服务重启导致任务中断，请重试";
          job.message = job.error;
          job.updatedAt = new Date().toISOString();
        }
        this.jobs.set(job.id, job);
      }
      await this.persist();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await this.persist();
    }
  }

  list(meetingId?: string) {
    return [...this.jobs.values()]
      .filter((job) => !meetingId || job.input.meetingId === meetingId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  get(id: string) {
    return this.jobs.get(id);
  }

  async createOrGet(
    input: DocumentJobInput,
    templateVersion: string,
  ): Promise<{ job: DocumentJob; created: boolean }> {
    const idempotencyKey = documentJobKey(input, templateVersion);
    const existing = this.list().find(
      (job) => job.idempotencyKey === idempotencyKey && job.status !== "failed",
    );
    if (existing) return { job: existing, created: false };

    const now = new Date().toISOString();
    const job: DocumentJob = {
      id: crypto.randomUUID(),
      idempotencyKey,
      input,
      status: "queued",
      archiveStatus: "pending",
      progress: 0,
      message: "任务已进入生成队列",
      attempt: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    await this.persist();
    return { job, created: true };
  }

  async update(id: string, patch: Partial<DocumentJob>) {
    const current = this.jobs.get(id);
    if (!current) throw new Error("生成任务不存在");
    const next: DocumentJob = {
      ...current,
      ...patch,
      input: patch.input ? { ...current.input, ...patch.input } : current.input,
      output: patch.output ? { ...current.output, ...patch.output } as DocumentJob["output"] : current.output,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(id, next);
    await this.persist();
    return next;
  }

  async retry(id: string) {
    const current = this.jobs.get(id);
    if (!current) throw new Error("生成任务不存在");
    if (current.status !== "failed") throw new Error("只有失败任务可以重试");
    return this.update(id, {
      status: "queued",
      archiveStatus: current.archiveStatus === "archived" ? "archived" : "pending",
      progress: 0,
      message: "任务已重新进入生成队列",
      attempt: current.attempt + 1,
      error: undefined,
      startedAt: undefined,
      completedAt: undefined,
    });
  }

  private persist() {
    this.writeChain = this.writeChain.then(async () => {
      const body: JobFile = { version: 1, jobs: this.list() };
      const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
      await fs.writeFile(temporaryPath, JSON.stringify(body, null, 2), "utf8");
      await fs.rename(temporaryPath, this.filePath);
    });
    return this.writeChain;
  }
}
