import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { extractLawTitle } from "./extractLawTitle.js";

const require = createRequire(import.meta.url);
const WordExtractor = require("word-extractor") as new () => {
  extract(path: string): Promise<{ getBody(): string }>;
};

export async function extractDocumentPlainText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".txt") {
    return fs.readFile(filePath, "utf-8");
  }
  if (ext === ".docx") {
    const r = await mammoth.extractRawText({ path: filePath });
    return r.value;
  }
  if (ext === ".pdf") {
    const buf = await fs.readFile(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    try {
      const tr = await parser.getText();
      return tr.text;
    } finally {
      await parser.destroy();
    }
  }
  if (ext === ".doc") {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(filePath);
    return doc.getBody();
  }
  throw new Error(`不支持的文件格式：${ext}`);
}

export function titleFromDocument(fullText: string, originalFilename: string): string {
  const stem = originalFilename.replace(/\.[^/.]+$/, "");
  return extractLawTitle(fullText, stem);
}
