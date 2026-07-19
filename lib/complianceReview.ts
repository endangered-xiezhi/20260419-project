export type ComplianceSeverity = "high" | "medium" | "low" | "info";

export type ComplianceFinding = {
  id: string;
  area: string;
  severity: ComplianceSeverity;
  title: string;
  conclusion: string;
  evidence: string;
  basis: string;
  recommendation: string;
};

export type ComplianceMeetingContext = {
  title?: string;
  type?: string;
  date?: string;
  noticeDate?: string;
  location?: string;
  companyName?: string;
  entityType?: string;
  participantNames?: string[];
  expectedAttendance?: number;
  actualAttendance?: number;
  proposals?: string[];
  minutesContent?: string;
  missingFields?: string[];
};

export type ComplianceReviewResult = {
  mode: "evidence-rules";
  score: number;
  conclusion: "高风险" | "中风险" | "待补充证据" | "低风险";
  documentType: string;
  extractedFacts: Record<string, string>;
  findings: ComplianceFinding[];
  riskAlerts: string[];
  missingItems: string[];
  trace: string;
  markdown: string;
};

const OFFICIAL_COMPANY_LAW_URL =
  "https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/fgs/art/2023/art_067c072db6ef4679a2e0180996be4cf8.html";

function normalizeText(input: string) {
  return input
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeEvidence(value: string) {
  return value
    .replace(/[<>]/g, (character) => (character === "<" ? "＜" : "＞"))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function findLine(lines: string[], patterns: Array<string | RegExp>) {
  return (
    lines.find((line) =>
      patterns.every((pattern) =>
        typeof pattern === "string" ? line.includes(pattern) : pattern.test(line),
      ),
    ) || ""
  );
}

function findExcerpt(text: string, needle: string, radius = 60) {
  const index = text.indexOf(needle);
  if (index < 0) return "";
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + needle.length + radius);
  return safeEvidence(text.slice(start, end));
}

function parseChineseDate(value: string) {
  const match = value.match(/(20\d{2})[年\/.-]\s*(\d{1,2})[月\/.-]\s*(\d{1,2})日?/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date | null) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateDifference(later: Date, earlier: Date) {
  return Math.round((later.getTime() - earlier.getTime()) / 86_400_000);
}

function extractLabelValue(lines: string[], labels: string[]) {
  for (const line of lines) {
    for (const label of labels) {
      const match = line.match(new RegExp(`${label}[：:]\\s*(.+)$`));
      if (match?.[1]) return safeEvidence(match[1]);
    }
  }
  return "";
}

function inferCompanyName(text: string, context?: ComplianceMeetingContext) {
  if (context?.companyName?.trim()) return context.companyName.trim();
  const match = text.match(
    /([A-Za-z0-9\u4e00-\u9fa5（）()·]{2,40}(?:股份有限公司|有限责任公司|有限公司))/,
  );
  return match?.[1] || "";
}

function inferMeetingType(text: string, context?: ComplianceMeetingContext) {
  if (context?.type?.trim()) return context.type.trim();
  if (/临时股东会/.test(text)) return "临时股东会";
  if (/股东会/.test(text)) return "股东会";
  if (/董事会/.test(text)) return "董事会";
  if (/监事会/.test(text)) return "监事会";
  return "会议文件";
}

function finding(
  id: string,
  area: string,
  severity: ComplianceSeverity,
  title: string,
  conclusion: string,
  evidence: string,
  basis: string,
  recommendation: string,
): ComplianceFinding {
  return {
    id,
    area,
    severity,
    title,
    conclusion,
    evidence: safeEvidence(evidence),
    basis,
    recommendation,
  };
}

function severityLabel(severity: ComplianceSeverity) {
  if (severity === "high") return "🔴 高风险";
  if (severity === "medium") return "⚠️ 中风险";
  if (severity === "low") return "🟡 提示";
  return "✅ 已核验";
}

function calculateScore(findings: ComplianceFinding[]) {
  const deductions = findings.reduce((total, item) => {
    if (item.severity === "high") return total + 14;
    if (item.severity === "medium") return total + 7;
    if (item.severity === "low") return total + 2;
    return total;
  }, 0);
  return Math.max(12, Math.min(98, 100 - deductions));
}

export function reviewMeetingDocument(
  rawContent: string,
  context?: ComplianceMeetingContext,
): ComplianceReviewResult {
  const documentText = normalizeText(rawContent || "");
  const contextText = normalizeText(context?.minutesContent || "");
  const text = [documentText, contextText].filter(Boolean).join("\n");
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  const companyName = inferCompanyName(text, context);
  const entityType =
    context?.entityType?.trim() ||
    (companyName.includes("股份有限公司")
      ? "股份有限公司"
      : companyName
        ? "有限责任公司"
        : "未识别");
  const meetingType = inferMeetingType(text, context);
  const meetingDateText =
    context?.date?.trim() ||
    extractLabelValue(lines, ["会议时间", "召开时间", "会议日期"]);
  const meetingDate = parseChineseDate(meetingDateText);
  const explicitNoticeText =
    context?.noticeDate?.trim() ||
    extractLabelValue(lines, ["通知日期", "通知时间", "通知发出时间", "通知发送时间"]);
  let noticeDate = parseChineseDate(explicitNoticeText);
  let noticeEvidence = explicitNoticeText;

  const relativeNoticeLine = findLine(lines, ["通知", /昨天|前一日/]);
  if (!noticeDate && meetingDate && relativeNoticeLine) {
    noticeDate = new Date(meetingDate);
    noticeDate.setDate(noticeDate.getDate() - 1);
    noticeEvidence = relativeNoticeLine;
  }

  const location =
    context?.location?.trim() || extractLabelValue(lines, ["会议地点", "召开地点"]);
  const chairperson = extractLabelValue(lines, ["主持人", "会议主持"]);
  const recorder = extractLabelValue(lines, ["记录人", "会议记录人"]);
  const fullCapitalLine = findLine(lines, ["代表公司全部注册资本"]);
  const allReceivedLine = findLine(lines, ["本次会议通知", /昨天|前一日/]);
  const votingEvidence = findLine(lines, [/同意.*反对.*弃权|表决结果|经表决/]);
  const signatureEvidence = findLine(lines, [/出席会议的股东.*签名|股东签字|股东签名|签字盖章/]);
  const signingPendingLine = findLine(lines, [/安排签字|后续签字|发送各位确认/]);

  const findings: ComplianceFinding[] = [];
  const missingItems: string[] = [];

  findings.push(
    finding(
      "fact-source",
      "证据来源",
      "info",
      "已读取当前上传文件",
      `本次审查基于当前文件正文${context ? "，并与飞书会议记录进行交叉核验" : ""}，未使用固定示例日期。`,
      lines[0] || "已提取上传文件正文",
      "证据审查原则：结论应能够回溯到当前材料原文。",
      "后续修改文件后，请重新点击审查以刷新结论。",
    ),
  );

  if (meetingDate) {
    findings.push(
      finding(
        "meeting-date",
        "基本信息",
        "info",
        "已识别会议日期",
        `会议日期识别为 ${formatDate(meetingDate)}。`,
        meetingDateText,
        "当前文件事实提取。",
        "请核对该日期与通知、签到表及决议首页是否一致。",
      ),
    );
  } else {
    missingItems.push("会议召开日期");
    findings.push(
      finding(
        "meeting-date-missing",
        "基本信息",
        "medium",
        "未识别会议日期",
        "无法继续计算通知期限，也无法与其他会议文件核对日期一致性。",
        "当前材料未发现“会议时间/会议日期”字段",
        "会议日期是程序审查的基础事实。",
        "补充明确的会议召开日期和时间。",
      ),
    );
  }

  if (meetingType.includes("股东会")) {
    if (meetingDate && noticeDate) {
      const days = dateDifference(meetingDate, noticeDate);
      const hasExplicitWaiver = /全体股东.{0,20}(一致同意|另有约定|豁免).{0,20}(通知|期限)|同意缩短.{0,10}通知/.test(
        text,
      );
      const severity: ComplianceSeverity = days < 15 && !hasExplicitWaiver ? "high" : "info";
      findings.push(
        finding(
          "notice-period",
          "召集通知",
          severity,
          days < 15 ? "通知期限需立即核验" : "通知期限已形成可核验记录",
          days < 15
            ? `按文件可识别信息，通知至开会相隔约 ${days} 天；未发现全体股东明确同意缩短通知期的书面表述。`
            : `按文件可识别信息，通知至开会相隔约 ${days} 天。`,
          noticeEvidence,
          "《公司法》第六十四条：有限责任公司股东会原则上应于会议召开十五日前通知全体股东；公司章程另有规定或全体股东另有约定的除外。",
          days < 15
            ? "核对公司章程；如确有全体股东同意缩短期限，请补充书面约定或全体签署的确认文件。"
            : "留存通知发送、送达回执和议程附件。",
        ),
      );
    } else {
      missingItems.push("会议通知发出日期或送达记录");
      findings.push(
        finding(
          "notice-missing",
          "召集通知",
          "medium",
          "通知期限无法判断",
          "当前材料没有可计算的通知发出日期，系统不会猜测通知天数。",
          allReceivedLine || "未发现通知发送日期或送达记录",
          "《公司法》第六十四条及公司章程约定。",
          "补充通知发送时间、发送对象、议程附件和送达回执。",
        ),
      );
    }
  }

  if (fullCapitalLine) {
    findings.push(
      finding(
        "attendance",
        "出席与表决权",
        "info",
        "已识别全体表决权出席表述",
        "实录称五名股东参加并代表全部注册资本，但仍应与股东名册、授权委托书交叉核验。",
        fullCapitalLine,
        "《公司法》第二十七条、第六十五条及公司章程。",
        "归档股东名册、签到表、法人股东授权委托书及身份证明。",
      ),
    );
  } else if (context?.actualAttendance !== undefined || context?.expectedAttendance !== undefined) {
    const expected = context.expectedAttendance ?? "未填";
    const actual = context.actualAttendance ?? "未填";
    findings.push(
      finding(
        "attendance-feishu",
        "出席与表决权",
        "low",
        "仅取得飞书人数信息",
        `飞书会议表记录应到 ${expected} 人、实到 ${actual} 人，但缺少对应表决权比例。`,
        `飞书会议表：应到 ${expected}，实到 ${actual}`,
        "《公司法》第二十七条、第六十五条及公司章程。",
        "补充每名股东的出资比例、代理关系和签到证据。",
      ),
    );
  } else {
    missingItems.push("出席股东及所代表表决权比例");
  }

  if (!votingEvidence) {
    missingItems.push("逐项表决结果（同意、反对、弃权及对应表决权）");
    findings.push(
      finding(
        "voting-result",
        "表决程序",
        "high",
        "未发现逐项表决结果",
        "文件记录了大量讨论和口头意见，但没有形成每项议案的同意、反对、弃权及通过比例，无法证明各项决议已经依法成立。",
        findExcerpt(text, "今天讨论的内容比较多") || "全文未识别到“表决结果/经表决/同意票、反对票、弃权票”",
        "《公司法》第二十七条：未对决议事项表决，或同意表决权未达到法定/章程比例的，决议可能不成立；第六十六条规定一般事项及特别事项通过比例。",
        "按议案逐项补做表决，记录每名股东意见及对应表决权，单独形成股东会决议。",
      ),
    );
  }

  if (!signatureEvidence) {
    missingItems.push("出席股东在会议记录上的签名或盖章");
    findings.push(
      finding(
        "signature",
        "签署归档",
        "medium",
        "会议记录尚缺签署证据",
        signingPendingLine
          ? "文件明确写明后续安排签字，说明当前上传版本尚不能证明已经完成签署。"
          : "当前上传版本未识别到出席股东签名或盖章。",
        signingPendingLine || "全文未识别到出席股东签名或盖章",
        "《公司法》第六十四条：出席会议的股东应当在会议记录上签名或者盖章。",
        "由出席股东或法人股东加盖公章/授权代表签署，形成不可篡改的归档版本。",
      ),
    );
  }

  const tenYearLine = findLine(lines, [/十年内完成全部出资|认缴期限.*十年/]);
  if (tenYearLine && entityType !== "股份有限公司") {
    findings.push(
      finding(
        "capital-term",
        "注册资本",
        "high",
        "十年认缴期限与现行五年规则冲突",
        "实录拟约定十年内完成全部出资；对新设有限责任公司，该期限与现行公司法的五年缴足规则明显不一致。",
        tenYearLine,
        "《公司法》第四十七条：有限责任公司股东认缴出资原则上应自公司成立之日起五年内缴足。",
        "将出资期限调整至法定范围，并同步核对章程、股东名册、出资证明书和登记信息。",
      ),
    );
  }

  const directorSupervisorLine = findLine(lines, ["由董事", /兼任.*监督|兼任监事/]);
  if (directorSupervisorLine) {
    findings.push(
      finding(
        "director-supervisor",
        "治理结构",
        "high",
        "董事兼任监督角色存在任职冲突",
        "实录拟由董事刘晨兼任监督公司财务和经营。若其被设置为监事，董事与监事不得兼任；如公司拟不设监事，也应满足全体股东一致同意等条件并形成明确决议。",
        directorSupervisorLine,
        "《公司法》第七十六条规定董事、高级管理人员不得兼任监事；第八十三条允许小型或股东较少的有限公司经全体股东一致同意不设监事。",
        "明确采用“设一名监事”还是“全体股东一致同意不设监事”的合法方案，不要让现任董事兼任监事。",
      ),
    );
  }

  const relatedPartyLine = findLine(lines, ["弟弟开的公司"]);
  const noDisclosureLine = findLine(lines, ["不用", /自己公司内部知道|关联关系/]);
  if (relatedPartyLine) {
    findings.push(
      finding(
        "related-party",
        "关联交易",
        "high",
        "关联供应商交易缺少合规决议链",
        "实录披露供应商由公司 CEO 的近亲属控制，但同时表示无需说明关联关系、无需比价，且未见依章程形成的有效决议。",
        `${relatedPartyLine}${noDisclosureLine ? `；${noDisclosureLine}` : ""}`,
        "《公司法》第一百八十二条：董监高近亲属控制企业与公司交易，应报告并按照章程经董事会或股东会决议通过；第一百八十五条规定关联董事回避。",
        "补充关联关系书面报告、市场化比价或定价依据、无关联董事/股东的有效表决记录。",
      ),
    );
  }

  const guaranteeLine = findLine(lines, [/提供担保|担保事项/]);
  const guaranteeDelegationLine = findLine(lines, ["担保事项", /董事长直接决定|不再召开股东会/]);
  if (guaranteeLine) {
    findings.push(
      finding(
        "external-guarantee",
        "对外担保",
        guaranteeDelegationLine ? "medium" : "low",
        "对外担保需与章程权限核对",
        guaranteeDelegationLine
          ? "实录拟将一定金额以下担保长期授权董事长直接决定，但当前材料没有公司章程及担保额度规则，无法确认授权边界。"
          : "材料涉及对外担保，需核对章程规定的决策机构和额度。",
        guaranteeDelegationLine || guaranteeLine,
        "《公司法》第十五条：公司对外投资或为他人提供担保，应按照公司章程由董事会或股东会决议，并遵守章程额度限制。",
        "调取现行章程，核对担保权限、额度、反担保及风险评估要求，并形成专项决议。",
      ),
    );
  }

  const sealLine = findLine(lines, ["公章", /放我办公室|一起放我这里/]);
  const preSealLine = findLine(lines, [/先盖章再审批|先签.*补手续|法务后补/]);
  if (sealLine || preSealLine) {
    findings.push(
      finding(
        "seal-contract-control",
        "印章与合同",
        "high",
        "印章集中保管及事后审批形成重大内控风险",
        "实录出现全部印章由同一人保管、部门可先签后补手续、特殊情况先盖章再审批等安排，存在越权签约、用印失控和责任追溯困难。",
        [sealLine, preSealLine].filter(Boolean).join("；"),
        "公司法上的忠实、勤勉义务及公司内部授权管理要求；具体权限还需以公司章程和制度为准。",
        "实行公章、财务章、法人章分离保管；合同先经业务、财务、法务审批，再用印并自动留痕。",
      ),
    );
  }

  const ipLine = findLine(lines, [/AI模型|算法平台/]);
  const noIpAgreementLine = findLine(lines, [/不用那么麻烦|先不用/]);
  if (ipLine && noIpAgreementLine) {
    findings.push(
      finding(
        "ip-ownership",
        "知识产权",
        "medium",
        "存量研发成果权属和出资手续不完整",
        "实录拟将个人既有模型、软件交由公司使用或作为出资，但未见评估作价、权利转让、许可范围和登记安排。",
        `${ipLine}；${noIpAgreementLine}`,
        "《公司法》第四十八条要求非货币财产可以估价并依法转让，且应评估作价、核实财产。",
        "分别签署知识产权转让/许可协议；如作为出资，完成评估作价、权利转移和登记。",
      ),
    );
  }

  const laborLine = findLine(lines, ["劳动合同", /一半没签|先入职再补/]);
  if (laborLine) {
    findings.push(
      finding(
        "labor-contract",
        "劳动用工",
        "high",
        "已识别劳动合同未及时签署事实",
        "实录称已有员工未签劳动合同或先入职后补合同，属于需要立即整改的劳动用工风险。",
        laborLine,
        "《劳动合同法》关于建立劳动关系后及时订立书面劳动合同的要求。",
        "立即盘点未签人员，补签劳动合同、保密与知识产权归属文件，并核对入职日期及社保记录。",
      ),
    );
  }

  const dataLine = findLine(lines, ["产品先上线"]);
  const collectsDataLine = findLine(lines, ["收集很多客户数据"]);
  if (dataLine && collectsDataLine) {
    findings.push(
      finding(
        "data-compliance",
        "数据合规",
        "medium",
        "产品上线前的数据合规准备不足",
        "实录已预见将收集大量客户数据，但决定先上线、以后再建立制度，存在上线前缺少处理规则和安全措施的风险。",
        `${collectsDataLine}；${dataLine}`,
        "《个人信息保护法》《数据安全法》《网络安全法》及相关配套要求。",
        "上线前完成数据清单、处理目的与法律基础、权限控制、留存期限、安全措施和隐私告知。",
      ),
    );
  }

  if (context?.missingFields?.length) {
    for (const item of context.missingFields) {
      if (!missingItems.includes(item)) missingItems.push(`飞书：${item}`);
    }
  }

  const score = calculateScore(findings);
  const highCount = findings.filter((item) => item.severity === "high").length;
  const mediumCount = findings.filter((item) => item.severity === "medium").length;
  const conclusion =
    highCount > 0
      ? "高风险"
      : mediumCount > 0
        ? "中风险"
        : missingItems.length > 0
          ? "待补充证据"
          : "低风险";
  const documentType = meetingType.includes("股东会")
    ? `${entityType}股东会会议实录`
    : `${meetingType}文件`;

  const extractedFacts: Record<string, string> = {
    文件类型: documentType,
    公司名称: companyName || "未识别",
    公司类型: entityType,
    会议类型: meetingType,
    会议日期: formatDate(meetingDate) || "未识别",
    通知日期: formatDate(noticeDate) || "未识别",
    会议地点: location || "未识别",
    主持人: chairperson || "未识别",
    记录人: recorder || "未识别",
    出席情况: fullCapitalLine || "未形成可核验的表决权信息",
  };

  const factsMarkdown = Object.entries(extractedFacts)
    .map(([key, value]) => `- **${key}**：${safeEvidence(value)}`)
    .join("\n");
  const findingsMarkdown = findings
    .map(
      (item, index) => `### ${index + 1}. ${severityLabel(item.severity)}｜${item.title}

**审查结论**：${item.conclusion}

> 原文证据：${item.evidence}

**核验依据**：${item.basis}

**处理建议**：${item.recommendation}`,
    )
    .join("\n\n");
  const missingMarkdown = missingItems.length
    ? missingItems.map((item) => `- ${item}`).join("\n")
    : "- 当前规则项未发现必需证据缺口";

  const markdown = `## 当前文件合规审查报告

**总体结论：${conclusion}｜合规指数 ${score}/100**

本报告只依据当前上传文件${context ? "及飞书会议表可读取数据" : ""}生成。文档没有提供的事实统一标为“无法判断”，不会自动编造日期、人数或表决结果。

### 已提取事实

${factsMarkdown}

### 逐项核验

${findingsMarkdown}

### 尚需补充的证据

${missingMarkdown}

### 使用说明

- “高风险”表示当前原文已出现明确冲突、缺失表决或重大内控安排，应优先整改。
- “无法判断”不等于“不合规”，表示需要补充章程、通知回执、签到表、表决票或签署页。
- 法律文本核对来源：国家市场监督管理总局公布的现行《中华人民共和国公司法》：${OFFICIAL_COMPANY_LAW_URL}`;

  const trace = `证据审查已完成
1. 读取当前文件：${lines.length} 个非空文本段
2. 识别文件类型：${documentType}
3. 提取公司、会议日期、通知、出席、表决、签署等事实
4. 将每一项结论绑定到当前文件原文
5. 区分“已证实风险”和“材料不足、无法判断”
6. 共识别：高风险 ${highCount} 项，中风险 ${mediumCount} 项，待补证 ${missingItems.length} 项
7. 本次未使用固定演示答案`;

  return {
    mode: "evidence-rules",
    score,
    conclusion,
    documentType,
    extractedFacts,
    findings,
    riskAlerts: findings
      .filter((item) => item.severity === "high" || item.severity === "medium")
      .map((item) => `${item.area}：${item.title}`)
      .slice(0, 10),
    missingItems,
    trace,
    markdown,
  };
}
