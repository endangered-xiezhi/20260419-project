/**
 * 扫描 public/最新规则，解析 doc/docx/pdf/txt，生成 public/data/rulesKnowledge.json
 * 运行：npx tsx scripts/build-rules-manifest.ts
 */
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import {
  extractDocumentPlainText,
  titleFromDocument,
} from "../lib/knowledgeExtract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
/** 源文件目录（项目根下，勿提交二进制的可复制到 public 仅用于构建） */
const RULES_DIR = path.join(ROOT, "最新规则");
const OUT_FILE = path.join(ROOT, "public", "data", "rulesKnowledge.json");
const TEXT_OUT_DIR = path.join(ROOT, "public", "rules-text");

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, acc);
    else if (/\.(docx|pdf|doc|txt)$/i.test(e.name)) acc.push(full);
  }
  return acc;
}

async function main() {
  const files = await walk(RULES_DIR);
  files.sort((a, b) => a.localeCompare(b, "zh-CN"));

  await fs.rm(TEXT_OUT_DIR, { recursive: true }).catch(() => {});
  await fs.mkdir(TEXT_OUT_DIR, { recursive: true });

  const items: Record<string, unknown>[] = [];
  let errors = 0;

  for (const abs of files) {
    try {
      const rel = path.relative(RULES_DIR, abs).split(path.sep).join("/");
      const raw = await extractDocumentPlainText(abs);
      const title = titleFromDocument(raw, path.basename(abs));
      const id =
        "rule-" +
        crypto.createHash("sha256").update(rel).digest("hex").slice(0, 16);
      const stat = await fs.stat(abs);

      const textFile = `${id}.txt`;
      await fs.writeFile(path.join(TEXT_OUT_DIR, textFile), raw, "utf-8");

      items.push({
        id,
        title,
        category: "法律法规",
        content: raw.slice(0, 500),
        lastModified: stat.mtime.toISOString().split("T")[0],
        status: "已生效",
        ocrSourceUrl: `/rules-text/${encodeURIComponent(textFile)}`,
      });
    } catch (e) {
      console.error("跳过:", abs, e);
      errors++;
    }
  }

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(items), "utf-8");
  console.log(`完成：${items.length} 条，跳过 ${errors}，输出 ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
