import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import crypto from "crypto";

export type MeetingPackageType = "shareholder" | "board" | "supervisor";

export type MeetingPackageInput = {
  meetingTitle: string;
  meetingType: MeetingPackageType;
  values?: Record<string, string | number | boolean | null | undefined>;
  proposals?: Array<{
    number?: string;
    title: string;
    content?: string;
  }>;
  participants?: Array<{
    name: string;
    role?: string;
    attended?: string;
    conflictOfInterest?: string;
  }>;
  shareholders?: Array<{
    name: string;
    type?: string;
    shares?: string | number;
    shareholding?: string | number;
    representative?: string;
  }>;
};

export type RenderedMeetingDocument = {
  fileName: string;
  buffer: Buffer;
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

function templateFolderFor(meetingType: MeetingPackageType) {
  return path.join(
    process.cwd(),
    "artifacts",
    "三会Word模板",
    TEMPLATE_FOLDERS[meetingType],
  );
}

export async function getMeetingTemplateVersion(meetingType: MeetingPackageType) {
  const templateFolder = templateFolderFor(meetingType);
  const names = (await fs.readdir(templateFolder))
    .filter((name) => name.toLowerCase().endsWith(".docx"))
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
  const hash = crypto.createHash("sha256");
  for (const name of names) {
    hash.update(name);
    hash.update(await fs.readFile(path.join(templateFolder, name)));
  }
  return hash.digest("hex");
}

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

function replaceProposalLoops(
  xml: string,
  proposals: NonNullable<MeetingPackageInput["proposals"]>,
) {
  const loopPattern = /<w:p\b(?:(?!<\/w:p>)[\s\S])*?\{\{#议案列表\}\}(?:(?!<\/w:p>)[\s\S])*?<\/w:p>([\s\S]*?)<w:p\b(?:(?!<\/w:p>)[\s\S])*?\{\{\/议案列表\}\}(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g;
  return xml.replace(loopPattern, (_match, body: string) => {
    const items = proposals.length ? proposals : [{ number: "", title: "（待填写议案）", content: "" }];
    const fillProposal = (template: string, proposal: typeof items[number], index: number) => template
      .split("{{序号}}").join(String(index + 1))
      .split("{{议案表.议案编号}}").join(escapeXml(proposal.number || String(index + 1)))
      .split("{{议案表.议案标题}}").join(escapeXml(proposal.title))
      .split("{{议案表.议案正文}}").join(escapeXml(proposal.content || ""));

    // 表决票模板用一张表表示多个议案：保留表头，只复制数据行。
    const tableMatch = body.match(/<w:tbl>[\s\S]*?<\/w:tbl>/);
    if (tableMatch) {
      const rows = tableMatch[0].match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
      if (rows.length >= 2) {
        const dataRows = rows.slice(1);
        const repeatedRows = items.map((proposal, index) =>
          fillProposal(dataRows[0], proposal, index)
        ).join("");
        const nextTable = tableMatch[0].replace(dataRows.join(""), repeatedRows);
        return body.replace(tableMatch[0], nextTable);
      }
    }

    return items.map((proposal, index) => fillProposal(body, proposal, index)).join("");
  });
}

function replaceListLoop<T>(
  xml: string,
  loopName: string,
  items: T[],
  valuesFor: (item: T, index: number) => Record<string, string>,
) {
  const escapedName = loopName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const loopPattern = new RegExp(
    `<w:p\\b(?:(?!<\\/w:p>)[\\s\\S])*?\\{\\{#${escapedName}\\}\\}(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>([\\s\\S]*?)<w:p\\b(?:(?!<\\/w:p>)[\\s\\S])*?\\{\\{\\/${escapedName}\\}\\}(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>`,
    "g",
  );
  return xml.replace(loopPattern, (_match, body: string) => {
    if (!items.length) return "";
    const tableMatch = body.match(/<w:tbl>[\s\S]*?<\/w:tbl>/);
    if (tableMatch) {
      const rows = tableMatch[0].match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
      if (rows.length >= 2) {
        const dataRows = rows.slice(1);
        const repeatedRows = items.map((item, index) => {
          let row = dataRows[0];
          for (const [token, value] of Object.entries(valuesFor(item, index))) {
            row = row.split(token).join(escapeXml(value));
          }
          return row;
        }).join("");
        return body.replace(tableMatch[0], tableMatch[0].replace(dataRows.join(""), repeatedRows));
      }
    }
    return items.map((item, index) => {
      let rendered = body;
      for (const [token, value] of Object.entries(valuesFor(item, index))) {
        rendered = rendered.split(token).join(escapeXml(value));
      }
      return rendered;
    }).join("");
  });
}

async function renderDocxTemplate(
  template: Buffer,
  values: Record<string, string>,
  proposals: NonNullable<MeetingPackageInput["proposals"]>,
  participants: NonNullable<MeetingPackageInput["participants"]>,
  shareholders: NonNullable<MeetingPackageInput["shareholders"]>,
) {
  const docxZip = await JSZip.loadAsync(template);
  const xmlFiles = Object.keys(docxZip.files).filter(
    (name) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(name),
  );

  await Promise.all(
    xmlFiles.map(async (name) => {
      const entry = docxZip.file(name);
      if (!entry) return;
      const xml = await entry.async("string");
      const expanded = replaceProposalLoops(xml, proposals);
      const withParticipants = replaceListLoop(expanded, "参会人员列表", participants, (person, index) => ({
        "{{序号}}": String(index + 1),
        "{{人员表.姓名文本}}": person.name,
        "{{人员表.角色}}": person.role || "",
        "{{人员表.是否出席}}": person.attended || "",
        "{{人员表.回避事项}}": person.conflictOfInterest || "",
      }));
      const withShareholders = replaceListLoop(withParticipants, "出席股东列表", shareholders, (shareholder, index) => ({
        "{{序号}}": String(index + 1),
        "{{股东表.股东名称}}": shareholder.name,
        "{{股东表.股东类型}}": shareholder.type || "",
        "{{股东表.持股数量}}": String(shareholder.shares ?? ""),
        "{{股东表.持股比例}}": shareholder.shareholding === undefined || shareholder.shareholding === ""
          ? ""
          : `${shareholder.shareholding}${String(shareholder.shareholding).includes("%") ? "" : "%"}`,
        "{{股东表.授权代表}}": shareholder.representative || "",
      }));
      const signers = participants.length ? participants : shareholders.map((shareholder) => ({ name: shareholder.name }));
      const withSigners = replaceListLoop(withShareholders, "签署人列表", signers, (person, index) => ({
        "{{序号}}": String(index + 1),
        "{{人员表.姓名文本}}": person.name,
      }));
      docxZip.file(name, replaceRunPlaceholders(withSigners, values));
    }),
  );

  return docxZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function createMeetingPackage(input: MeetingPackageInput) {
  const templateFolder = templateFolderFor(input.meetingType);
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
  const proposals = input.proposals || [];
  const participants = input.participants || [];
  const shareholders = input.shareholders || [];
  const folderName = safeFileName(input.meetingTitle);
  const packageZip = new JSZip();
  const meetingFolder = packageZip.folder(folderName);
  if (!meetingFolder) throw new Error("无法创建会议档案目录");
  const documents: RenderedMeetingDocument[] = [];

  for (const templateName of templateNames) {
    const source = await fs.readFile(path.join(templateFolder, templateName));
    const rendered = await renderDocxTemplate(source, values, proposals, participants, shareholders);
    const cleanTemplateName = templateName.replace(/^\d+-/, "");
    const fileName = `${folderName}_${cleanTemplateName}`;
    documents.push({ fileName, buffer: rendered });
    meetingFolder.file(fileName, rendered);
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
    documents,
  };
}
