import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";

export type MeetingPackageType = "shareholder" | "board" | "supervisor";

export type MeetingPackageInput = {
  meetingTitle: string;
  meetingType: MeetingPackageType;
  values?: Record<string, string | number | boolean | null | undefined>;
};

const TEMPLATE_FOLDERS: Record<MeetingPackageType, string> = {
  shareholder: "01-股东会",
  board: "02-董事会",
  supervisor: "03-监事会",
};

const EXPECTED_FILE_COUNTS: Record<MeetingPackageType, number> = {
  shareholder: 9,
  board: 6,
  supervisor: 6,
};

function safeFileName(value: string) {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return (cleaned || "未命名会议").slice(0, 100);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizedValues(input: MeetingPackageInput) {
  const meetingTypeName = {
    shareholder: "股东会",
    board: "董事会",
    supervisor: "监事会",
  }[input.meetingType];

  const values: Record<string, string> = {
    "{{会议表.主题}}": input.meetingTitle,
    "{{会议表.会议类型}}": meetingTypeName,
  };

  for (const [key, rawValue] of Object.entries(input.values || {})) {
    if (rawValue === null || rawValue === undefined) continue;
    const token = key.startsWith("{{") && key.endsWith("}}") ? key : `{{${key}}}`;
    values[token] = String(rawValue);
  }
  return values;
}

function replaceRunPlaceholders(xml: string, values: Record<string, string>) {
  return xml.replace(/<w:r\b[\s\S]*?<\/w:r>/g, (runXml) => {
    let next = runXml;
    let replaced = false;

    for (const [token, value] of Object.entries(values)) {
      if (!next.includes(token)) continue;
      next = next.split(token).join(escapeXml(value));
      replaced = true;
    }

    if (!replaced) return next;

    return next
      .replace(/<w:shd\b[^>]*\/>/g, "")
      .replace(/<w:color\b[^>]*w:val="1F4E78"[^>]*\/>/g, '<w:color w:val="000000"/>');
  });
}

async function renderDocxTemplate(template: Buffer, values: Record<string, string>) {
  const docxZip = await JSZip.loadAsync(template);
  const xmlFiles = Object.keys(docxZip.files).filter(
    (name) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(name),
  );

  await Promise.all(
    xmlFiles.map(async (name) => {
      const entry = docxZip.file(name);
      if (!entry) return;
      const xml = await entry.async("string");
      docxZip.file(name, replaceRunPlaceholders(xml, values));
    }),
  );

  return docxZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function createMeetingPackage(input: MeetingPackageInput) {
  const templateFolder = path.join(
    process.cwd(),
    "artifacts",
    "三会Word模板",
    TEMPLATE_FOLDERS[input.meetingType],
  );
  const entries = await fs.readdir(templateFolder, { withFileTypes: true });
  const templateNames = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".docx"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "zh-CN"));

  if (templateNames.length !== EXPECTED_FILE_COUNTS[input.meetingType]) {
    throw new Error(
      `${TEMPLATE_FOLDERS[input.meetingType]}模板数量异常：应为 ${EXPECTED_FILE_COUNTS[input.meetingType]} 份，实际为 ${templateNames.length} 份`,
    );
  }

  const values = normalizedValues(input);
  const folderName = safeFileName(input.meetingTitle);
  const packageZip = new JSZip();
  const meetingFolder = packageZip.folder(folderName);
  if (!meetingFolder) throw new Error("无法创建会议档案目录");

  for (const templateName of templateNames) {
    const source = await fs.readFile(path.join(templateFolder, templateName));
    const rendered = await renderDocxTemplate(source, values);
    const cleanTemplateName = templateName.replace(/^\d+-/, "");
    meetingFolder.file(`${folderName}_${cleanTemplateName}`, rendered);
  }

  const buffer = await packageZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    buffer,
    fileCount: templateNames.length,
    fileName: `${folderName}_会议档案.zip`,
    documentNames: templateNames.map((name) => name.replace(/^\d+-/, "")),
  };
}

