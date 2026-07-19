export function normalizeCompanyName(rawName?: string, entityType = "") {
  const name = (rawName || "").trim().replace(/[（(]演示[）)]$/, "").trim();
  if (!name) return "";
  if (/(股份有限公司|有限责任公司|有限公司)$/.test(name)) return name;

  const jointStock = entityType.includes("股份") || /股份$/.test(name);
  const stem = name
    .replace(/股份$/, "")
    .replace(/(?:有限责任)?公司$/, "")
    .trim();

  return `${stem || "XXX"}${jointStock ? "股份有限公司" : "有限公司"}`;
}

export function fallbackCompanyName(rawName?: string, entityType = "") {
  return normalizeCompanyName(rawName, entityType) ||
    (entityType.includes("股份") ? "XXX股份有限公司" : "XXX有限公司");
}
