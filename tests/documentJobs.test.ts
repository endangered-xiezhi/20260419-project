import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DocumentJobStore } from "../lib/documentJobs.js";

const input = {
  meetingTitle: "测试董事会",
  meetingType: "board" as const,
  values: { "公司主体表.公司名称": "测试有限公司" },
};

test("相同数据与模板版本复用同一生成任务", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "document-jobs-"));
  const store = new DocumentJobStore(path.join(directory, "jobs.json"));
  await store.initialize();
  const first = await store.createOrGet(input, "template-v1");
  const second = await store.createOrGet(
    { ...input, requestedBy: "另一位操作人" },
    "template-v1",
  );
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.job.id, first.job.id);
});

test("失败任务可以重试且尝试次数递增", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "document-jobs-"));
  const store = new DocumentJobStore(path.join(directory, "jobs.json"));
  await store.initialize();
  const { job } = await store.createOrGet(input, "template-v1");
  await store.update(job.id, { status: "failed", archiveStatus: "failed", error: "模拟失败" });
  const retried = await store.retry(job.id);
  assert.equal(retried.status, "queued");
  assert.equal(retried.attempt, 2);
  assert.equal(retried.error, undefined);
});

test("服务重启后把中断任务标记为可重试失败", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "document-jobs-"));
  const file = path.join(directory, "jobs.json");
  const firstStore = new DocumentJobStore(file);
  await firstStore.initialize();
  const { job } = await firstStore.createOrGet(input, "template-v1");
  await firstStore.update(job.id, { status: "running", progress: 50 });

  const restartedStore = new DocumentJobStore(file);
  await restartedStore.initialize();
  const recovered = restartedStore.get(job.id);
  assert.equal(recovered?.status, "failed");
  assert.match(recovered?.error || "", /服务重启/);
});
