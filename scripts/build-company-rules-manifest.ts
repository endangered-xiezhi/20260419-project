/**
 * 将公司三会及制度 TXT 文件导入前端规则文件库。
 * 默认源目录：/Users/kansang/Downloads/三会文件txt/宁德时代
 * 也可将源目录作为第一个命令行参数传入。
 */
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCE_DIR = path.resolve(
  process.argv[2] || "/Users/kansang/Downloads/三会文件txt/宁德时代",
);
const OUT_FILE = path.join(ROOT, "public", "data", "companyRulesKnowledge.json");
const TEXT_OUT_DIR = path.join(ROOT, "public", "company-rules-text");

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(fullPath, acc);
    else if (/\.txt$/i.test(entry.name)) acc.push(fullPath);
  }
  return acc;
}

function titleFromFile(fileName: string): string {
  return fileName
    .replace(/\.txt$/i, "")
    .replace(/^宁德时代_?/, "")
    .replace(/宁德时代/g, "");
}

function dateFromFile(fileName: string, fallback: Date): string {
  const match = fileName.match(/(20\d{2})年(?:(\d{1,2})月)?/);
  if (!match) return fallback.toISOString().split("T")[0];
  return `${match[1]}-${String(Number(match[2] || 1)).padStart(2, "0")}-01`;
}

async function main() {
  const files = await walk(SOURCE_DIR);
  files.sort((a, b) => a.localeCompare(b, "zh-CN"));

  await fs.rm(TEXT_OUT_DIR, { recursive: true }).catch(() => undefined);
  await fs.mkdir(TEXT_OUT_DIR, { recursive: true });

  const items = [];
  for (const absolutePath of files) {
    const relativePath = path.relative(SOURCE_DIR, absolutePath).split(path.sep).join("/");
    const content = (await fs.readFile(absolutePath, "utf-8")).replace(/^\uFEFF/, "");
    const id = `catl-${crypto.createHash("sha256").update(relativePath).digest("hex").slice(0, 16)}`;
    const textFile = `${id}.txt`;
    const stat = await fs.stat(absolutePath);

    await fs.writeFile(path.join(TEXT_OUT_DIR, textFile), content, "utf-8");
    items.push({
      id,
      title: titleFromFile(path.basename(absolutePath)),
      category: "公司内部规范性文件",
      content: content.trim().slice(0, 500),
      lastModified: dateFromFile(path.basename(absolutePath), stat.mtime),
      status: "已生效",
      ocrSourceUrl: `/company-rules-text/${textFile}`,
    });
  }

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(items), "utf-8");
  console.log(`完成：导入 ${items.length} 份公司内部规范性文件`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
