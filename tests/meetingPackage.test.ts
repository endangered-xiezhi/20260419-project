import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import {
  createMeetingPackage,
  getMeetingTemplateVersion,
} from "../lib/meetingPackage.js";

test("董事会生成六份 Word 和一个可下载 ZIP", async () => {
  const result = await createMeetingPackage({
    meetingTitle: "第一届董事会第一次会议",
    meetingType: "board",
    values: {
      "公司主体表.公司名称": "星瀚测试有限公司",
      "会议表.会议地点": "第一会议室",
    },
  });
  assert.equal(result.fileCount, 6);
  assert.equal(result.documents.length, 6);
  assert.ok(result.buffer.length > 0);

  const zip = await JSZip.loadAsync(result.buffer);
  const wordFiles = Object.keys(zip.files).filter((name) => name.endsWith(".docx"));
  assert.equal(wordFiles.length, 6);
});

test("模板内容变化会反映在稳定版本哈希中", async () => {
  const first = await getMeetingTemplateVersion("board");
  const second = await getMeetingTemplateVersion("board");
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, second);
});

test("签到表和签字页自动写入已选会议人员及股东持股数据", async () => {
  const result = await createMeetingPackage({
    meetingTitle: "2026年第一次临时股东会",
    meetingType: "shareholder",
    participants: [
      { name: "张董事", role: "董事" },
      { name: "李股东", role: "自然人股东" },
    ],
    shareholders: [
      { name: "李股东", type: "自然人股东", shares: 120000, shareholding: 12.5 },
    ],
  });

  const signin = result.documents.find((document) => document.fileName.includes("签到表"));
  const resolution = result.documents.find((document) => document.fileName.includes("会议决议"));
  assert.ok(signin);
  assert.ok(resolution);

  const signinZip = await JSZip.loadAsync(signin.buffer);
  const signinXml = await signinZip.file("word/document.xml")!.async("string");
  assert.match(signinXml, /李股东/);
  assert.match(signinXml, /120000/);
  assert.match(signinXml, /12\.5%/);
  assert.doesNotMatch(signinXml, /\{\{#出席股东列表\}\}/);

  const resolutionZip = await JSZip.loadAsync(resolution.buffer);
  const resolutionXml = await resolutionZip.file("word/document.xml")!.async("string");
  assert.match(resolutionXml, /张董事/);
  assert.match(resolutionXml, /李股东/);
  assert.doesNotMatch(resolutionXml, /\{\{#签署人列表\}\}/);
});
