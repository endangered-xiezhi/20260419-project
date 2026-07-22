import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMeetingMinutes, type FeishuRecord } from "../lib/feishu.js";

test("飞书会议表中的纪要正文和妙记链接会进入历史记录", () => {
  const records: FeishuRecord[] = [
    {
      record_id: "rec-minutes",
      last_modified_time: Date.parse("2026-07-22T00:00:00+08:00"),
      fields: {
        主题: "第三届董事会第十二次会议",
        时间: Date.parse("2026-07-20T10:00:00+08:00"),
        会议纪要正文: "审议并通过年度预算议案。",
        "妙记/纪要链接": { link: "https://example.feishu.cn/minutes/1" },
      },
    },
    {
      record_id: "rec-empty",
      fields: { 主题: "尚未形成纪要的会议" },
    },
  ];

  assert.deepEqual(normalizeMeetingMinutes(records), [{
    meetingId: "rec-minutes",
    meetingTitle: "第三届董事会第十二次会议",
    title: "第三届董事会第十二次会议纪要",
    date: "2026-07-20",
    content: "审议并通过年度预算议案。",
    minutesUrl: "https://example.feishu.cn/minutes/1",
    updatedAt: "2026-07-22",
  }]);
});
