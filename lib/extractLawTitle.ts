/** 从法规全文前部抽取名称：优先「《…》」，其次合理标题行，最后文件名 */
export function extractLawTitle(fullText: string, filenameStem: string): string {
  const normalized = fullText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const fallback =
    filenameStem
      .replace(/\.[^/.]+$/, "")
      .replace(/^[\s._\-【\[]*(?:\[?OCR\]?_?)?/i, "")
      .replace(/[\s_-]+$/g, "")
      .trim() || "未命名文件";

  if (!normalized) return fallback;

  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines.slice(0, 45)) {
    const books = line.match(/《[^》]{2,200}》/g);
    if (books?.length) {
      return books.reduce((a, b) => (a.length >= b.length ? a : b)).slice(0, 200);
    }
  }

  for (const line of lines.slice(0, 22)) {
    if (line.length < 4 || line.length > 160) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^(第[一二三四五六七八九十百千零〇\d]+条|附件|目录|引言)/.test(line)) continue;
    const cleaned = line.replace(/^[\d\s.、．\)）]+/, "").trim();
    if (cleaned.length >= 4) return cleaned.slice(0, 120);
  }

  const first = lines[0].replace(/^[\d\s.、．\)）]+/, "").trim();
  return (first.slice(0, 120) || fallback);
}
