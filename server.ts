import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";
import { extractDocumentPlainText, titleFromDocument } from "./lib/knowledgeExtract.js";
import { glmChatCompletion } from "./lib/glmChat.js";
import {
  reviewMeetingDocument,
  type ComplianceMeetingContext,
} from "./lib/complianceReview.js";
import {
  createFeishuMeeting,
  createFeishuProposals,
  createFeishuVotingDocument,
  deleteFeishuMeeting,
  downloadFeishuBitableAttachment,
  getFeishuConfiguration,
  getFeishuDocumentForReview,
  getFeishuMeeting,
  getFeishuMeetingSourceBundle,
  getFeishuVotingContext,
  listFeishuPersonnel,
  listFeishuMeetings,
  listFeishuTables,
  submitFeishuVote,
  updateFeishuMeeting,
  updateFeishuDocumentReview,
  type FeishuMeetingInput,
  type FeishuVoteInput,
  type FeishuVotingDocumentInput,
  type GeneratedProposalInput,
} from "./lib/feishu.js";
import { createMeetingPackage, type MeetingPackageType } from "./lib/meetingPackage.js";

// 腾讯云配置 - 从环境变量读取
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID || "";
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY || "";

// 腾讯云 SDK（动态导入）
let AsrClient: any, CreateRecTaskRequest: any, DescribeTaskStatusRequest: any;

async function initTencentSDK() {
  const tencentcloud = await import("tencentcloud-sdk-nodejs");
  const asrModule = tencentcloud.asr.v20190614;
  AsrClient = asrModule.Client;
  CreateRecTaskRequest = asrModule.CreateRecTaskRequest;
  DescribeTaskStatusRequest = asrModule.DescribeTaskStatusRequest;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  // 初始化腾讯云 SDK
  await initTencentSDK();
  console.log("腾讯云 SDK 初始化完成");

  const app = express();
  // Render supplies PORT automatically; use 3001 when running locally.
  const PORT = Number(process.env.PORT) || 3001;

  app.use(express.json());

  // CORS 中间件 - 允许前端跨域请求
  app.use((req, res, next) => {
    // 允许所有来源的跨域请求（开发环境）
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });

  // 请求日志中间件 - 帮助调试
  app.use((req, res, next) => {
    if (req.path.includes('yuanqi')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    next();
  });

  // 创建上传目录
  const uploadsDir = join(__dirname, "uploads");
  const meetingPackagesDir = join(uploadsDir, "meeting-packages");
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
  await fs.mkdir(meetingPackagesDir, { recursive: true });

  // 配置文件上传
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    }
  });

  const uploadAudio = multer({
    storage,
    fileFilter: (req, file, cb) => {
      const allowedTypes = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".wma", ".flac"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(ext)) cb(null, true);
      else cb(new Error("只支持常见音频格式"));
    },
  });

  const uploadKnowledge = multer({
    storage,
    fileFilter: (req, file, cb) => {
      const allowedTypes = [".txt", ".docx", ".doc", ".pdf"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(ext)) cb(null, true);
      else cb(new Error("规则库仅支持 .txt、.doc、.docx、.pdf"));
    },
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Safe Feishu connection check. It never returns credentials or table content.
  app.get("/api/feishu/status", async (_req, res) => {
    const fields = getFeishuConfiguration();
    const configured = Object.values(fields).every(Boolean);

    if (!configured) {
      return res.json({ configured: false, connected: false, fields });
    }

    try {
      const tables = await listFeishuTables();
      res.json({ configured: true, connected: true, tableCount: tables.length });
    } catch (error) {
      res.status(502).json({
        configured: true,
        connected: false,
        error: error instanceof Error ? error.message : "飞书连接失败",
      });
    }
  });

  function validMeetingInput(body: unknown, requireCoreFields: boolean) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("会议数据格式错误");
    }
    const input = body as FeishuMeetingInput;
    if (requireCoreFields && (!input.title?.trim() || !input.type || !input.date)) {
      throw new Error("会议标题、会议类型和日期不能为空");
    }
    if (input.participantNames !== undefined && !Array.isArray(input.participantNames)) {
      throw new Error("参会人员必须是姓名列表");
    }
    return input;
  }

  function feishuApiError(res: express.Response, error: unknown) {
    const message = error instanceof Error ? error.message : "飞书数据操作失败";
    const status = /不能为空|格式错误|日期格式|没有找到/.test(message) ? 400 : 502;
    return res.status(status).json({ success: false, error: message });
  }

  app.get("/api/feishu/meetings", async (_req, res) => {
    try {
      const meetings = await listFeishuMeetings();
      return res.json({
        success: true,
        meetings,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      return feishuApiError(res, error);
    }
  });

  app.get("/api/feishu/personnel", async (_req, res) => {
    try {
      const personnel = await listFeishuPersonnel();
      return res.json({
        success: true,
        personnel,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      return feishuApiError(res, error);
    }
  });

  app.get("/api/feishu/meetings/:recordId", async (req, res) => {
    try {
      const meeting = await getFeishuMeeting(req.params.recordId);
      return res.json({ success: true, meeting });
    } catch (error) {
      return feishuApiError(res, error);
    }
  });

  app.post("/api/feishu/meetings", async (req, res) => {
    try {
      const input = validMeetingInput(req.body, true);
      const meeting = await createFeishuMeeting({
        ...input,
        title: input.title?.trim(),
        status: input.status || "筹备中",
      });
      return res.status(201).json({ success: true, meeting });
    } catch (error) {
      return feishuApiError(res, error);
    }
  });

  app.put("/api/feishu/meetings/:recordId", async (req, res) => {
    try {
      const input = validMeetingInput(req.body, false);
      const meeting = await updateFeishuMeeting(req.params.recordId, input);
      return res.json({ success: true, meeting });
    } catch (error) {
      return feishuApiError(res, error);
    }
  });

  app.delete("/api/feishu/meetings/:recordId", async (req, res) => {
    try {
      await deleteFeishuMeeting(req.params.recordId);
      return res.json({ success: true });
    } catch (error) {
      return feishuApiError(res, error);
    }
  });

  app.get("/api/feishu/meetings/:recordId/voting-context", async (req, res) => {
    try {
      const context = await getFeishuVotingContext(req.params.recordId);
      return res.json({ success: true, context, syncedAt: new Date().toISOString() });
    } catch (error) {
      return feishuApiError(res, error);
    }
  });

  app.get("/api/feishu/meetings/:recordId/source-bundle", async (req, res) => {
    try {
      const bundle = await getFeishuMeetingSourceBundle(req.params.recordId);
      return res.json({ success: true, bundle, syncedAt: new Date().toISOString() });
    } catch (error) {
      return feishuApiError(res, error);
    }
  });

  const demoProposalsFor = (meetingType: string): GeneratedProposalInput[] => {
    if (meetingType.includes("股东")) {
      return [
        {
          title: "关于审议公司2025年度董事会工作报告的议案",
          type: "年度报告",
          legalBasis: "《中华人民共和国公司法》及公司章程关于股东会职权的规定",
          recommendation: "建议股东会审议通过，并授权董事会落实报告所列年度重点工作。",
          content: "董事会已对2025年度公司治理、经营计划执行、重大事项决策、内部控制建设及股东会决议执行情况进行了全面总结。报告认为，公司治理机构运行规范，重点经营指标总体符合年度计划，重大交易均履行了相应审议程序。现提请股东会审议。",
        },
        {
          title: "关于公司2025年度利润分配方案的议案",
          type: "利润分配",
          legalBasis: "《中华人民共和国公司法》、公司章程及公司利润分配管理制度",
          recommendation: "建议在审计数据、可分配利润及现金流安全边界核实后审议通过。",
          content: "综合考虑公司盈利情况、现金流状况、后续投资安排和股东合理回报，公司拟以实施权益分派股权登记日的总股本为基数进行现金分红，剩余未分配利润结转以后年度。本议案不涉及以资本公积转增股本。",
        },
        {
          title: "关于建设公司三会治理数字化管理机制的议案",
          type: "公司治理",
          legalBasis: "《中华人民共和国公司法》及公司内部会议管理制度",
          recommendation: "建议明确数据口径、权限边界、档案责任和实施期限后提交股东会表决。",
          content: "为提升会议通知、议案审议、表决统计、纪要整理和文书归档的可追溯性，公司拟建设以飞书多维表格为数据中台的三会治理数字化机制，统一公司主体、人员、会议、议案、文书和表决数据，并保留全过程操作记录。",
        },
      ];
    }
    if (meetingType.includes("监事")) {
      return [
        {
          title: "关于审议公司2025年度监事会工作报告的议案",
          type: "监督报告",
          legalBasis: "《中华人民共和国公司法》及公司章程关于监事会职权的规定",
          recommendation: "建议监事会审议通过后提交年度股东会。",
          content: "报告覆盖依法运作、财务检查、关联交易、内部控制、募集资金及董事高级管理人员履职监督情况。监事会认为公司重大决策程序总体合规，未发现损害公司和股东利益的重大情形。",
        },
        {
          title: "关于公司2025年度内部控制评价报告的审核议案",
          type: "内部控制",
          legalBasis: "公司法、公司章程及公司内部控制制度",
          recommendation: "建议对整改事项设定责任人和完成期限，并按季度跟踪闭环。",
          content: "监事会对内部控制评价范围、评价方法、缺陷认定标准和整改进展进行了复核。现有控制体系能够覆盖主要业务和重大风险，但合同归档、关联方识别和会议资料留痕仍需进一步强化。",
        },
        {
          title: "关于董事及高级管理人员2025年度履职情况的监督议案",
          type: "履职监督",
          legalBasis: "《中华人民共和国公司法》及公司章程",
          recommendation: "建议形成书面监督意见并纳入年度履职档案。",
          content: "监事会拟从忠实勤勉义务、重大事项报告、关联利益申报、会议出席和决议执行等维度，对董事和高级管理人员年度履职情况进行评价并形成监督意见。",
        },
      ];
    }
    return [
      {
        title: "关于审议公司2026年度经营计划及全面预算的议案",
        type: "经营预算",
        legalBasis: "《中华人民共和国公司法》及公司章程关于董事会职权的规定",
        recommendation: "建议审议通过，并建立预算偏差月度监测和重大偏差报告机制。",
        content: "公司结合行业趋势、在手订单、资金安排和风险承受能力编制了2026年度经营计划及全面预算。计划重点提升主营业务质量、现金流管理和重大项目投后管理水平，并明确预算调整权限和预警阈值。",
      },
      {
        title: "关于公司办公场地租赁协议修订方案的议案",
        type: "重大合同",
        legalBasis: "公司章程、董事会议事规则及合同管理制度",
        recommendation: "建议在核实租金公允性、租期、提前解约和关联关系后审议。",
        content: "因经营布局调整，公司拟修订办公场地租赁协议。修订内容包括租赁面积、租金递增机制、装修投入归属、维修责任和提前解除安排。管理层已完成商业必要性和现金流影响测算。",
      },
      {
        title: "关于完善公司三会治理与会议档案数字化管理机制的议案",
        type: "公司治理",
        legalBasis: "《中华人民共和国公司法》、公司章程及档案管理制度",
        recommendation: "建议通过，并授权董事会秘书组织实施。",
        content: "为提升会议通知、议案审议、表决统计、纪要整理、合规复核和文书归档的可追溯性，公司拟建设以飞书多维表格为数据中台的三会治理数字化机制，明确数据口径、审批权限和档案保管责任。",
      },
    ];
  };

  app.post("/api/feishu/meetings/:recordId/proposals/generate", async (req, res) => {
    try {
      const meeting = await getFeishuMeeting(req.params.recordId);
      const requestedCount = Math.max(1, Math.min(Number(req.body?.count) || 3, 8));
      let proposals = demoProposalsFor(meeting.type).slice(0, requestedCount);
      let mode: "ai" | "demo" = "demo";
      const apiKey = process.env.ZHIPU_API_KEY?.trim();
      if (apiKey) {
        try {
          const result = await glmChatCompletion({
            apiKey,
            model: process.env.ZHIPU_MODEL || "glm-4-flash",
            temperature: 0.35,
            messages: [
              {
                role: "system",
                content: "你是公司三会治理秘书。只输出 JSON 数组，不要输出解释。每项包含 title、type、content、legalBasis、recommendation。内容必须完整、可直接审议，不使用占位符。",
              },
              {
                role: "user",
                content: `请为${meeting.companyName || "该公司"}的“${meeting.title}”（类型：${meeting.type}，日期：${meeting.date}）生成 ${requestedCount} 项相互独立的议案。优先使用会议已有字段：${JSON.stringify(meeting.fields)}。`,
              },
            ],
          });
          const jsonText = result.content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed) && parsed.length) {
            proposals = parsed.slice(0, requestedCount) as GeneratedProposalInput[];
            mode = "ai";
          }
        } catch (error) {
          console.warn("议案 AI 生成失败，改用完整演示议案：", error);
        }
      }
      const created = await createFeishuProposals(req.params.recordId, proposals);
      return res.status(201).json({ success: true, mode, proposals, created });
    } catch (error) {
      return feishuApiError(res, error);
    }
  });

  app.post("/api/feishu/documents", async (req, res) => {
    try {
      const document = await createFeishuVotingDocument(req.body as FeishuVotingDocumentInput);
      return res.status(201).json({ success: true, document });
    } catch (error) {
      return feishuApiError(res, error);
    }
  });

  app.post("/api/feishu/votes", async (req, res) => {
    try {
      const vote = await submitFeishuVote(req.body as FeishuVoteInput);
      return res.status(vote.action === "created" ? 201 : 200).json({ success: true, vote });
    } catch (error) {
      return feishuApiError(res, error);
    }
  });

  /**
   * 根据会议类型生成整套 Word，并在服务端打包成 ZIP。
   * Body: { meetingId?, meetingTitle, meetingType, values? }
   */
  app.post("/api/meetings/package", async (req, res) => {
    try {
      const { meetingId, meetingTitle, meetingType, values } = req.body as {
        meetingId?: string;
        meetingTitle?: string;
        meetingType?: MeetingPackageType;
        values?: Record<string, string | number | boolean | null>;
      };

      let feishuMeeting: Awaited<ReturnType<typeof getFeishuMeeting>> | null = null;
      let votingContext: Awaited<ReturnType<typeof getFeishuVotingContext>> | null = null;
      if (meetingId?.startsWith("rec")) {
        feishuMeeting = await getFeishuMeeting(meetingId);
        votingContext = await getFeishuVotingContext(meetingId);
      }

      const effectiveTitle = meetingTitle?.trim() || feishuMeeting?.title;
      if (!effectiveTitle) {
        return res.status(400).json({ success: false, error: "缺少会议标题或有效的飞书会议记录 ID" });
      }

      const typeFromFeishu: MeetingPackageType | undefined = feishuMeeting
        ? feishuMeeting.type.includes("股东")
          ? "shareholder"
          : feishuMeeting.type.includes("监事")
            ? "supervisor"
            : "board"
        : undefined;
      const effectiveType = meetingType || typeFromFeishu;
      if (!effectiveType || !["shareholder", "board", "supervisor"].includes(effectiveType)) {
        return res.status(400).json({ success: false, error: "会议类型必须是 shareholder、board 或 supervisor" });
      }
      if (values !== undefined && (typeof values !== "object" || Array.isArray(values))) {
        return res.status(400).json({ success: false, error: "values 必须是占位符字段对象" });
      }

      const feishuValues: Record<string, string | number | boolean | null> = {};
      if (feishuMeeting) {
        const displayValue = (value: unknown) => {
          if (value === null || value === undefined) return "";
          if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
          if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join("、");
          if (typeof value === "object") {
            const item = value as Record<string, unknown>;
            return displayValue(item.text || item.name || item.value || "");
          }
          return "";
        };
        for (const [fieldName, fieldValue] of Object.entries(feishuMeeting.fields)) {
          feishuValues[`会议表.${fieldName}`] = displayValue(fieldValue);
        }
        feishuValues["会议表.主题"] = feishuMeeting.title;
        feishuValues["会议表.会议类型"] = feishuMeeting.type;
        feishuValues["会议表.时间"] = feishuMeeting.date;
        feishuValues["会议表.时间|日期"] = feishuMeeting.date;
        feishuValues["会议表.时间|时间"] = feishuMeeting.startTime;
        feishuValues["会议表.会议地点"] = feishuMeeting.location;
        feishuValues["会议表.会务联系人"] = feishuMeeting.contactName;
        feishuValues["会议表.会务联系电话"] = feishuMeeting.contactPhone;
        feishuValues["会议表.会务邮箱"] = feishuMeeting.contactEmail;
        feishuValues["会议表.状态"] = feishuMeeting.status;
        feishuValues["会议表.参会人员"] = feishuMeeting.participantNames.join("、");
        if (feishuMeeting.companyName) {
          feishuValues["公司主体表.公司名称"] = feishuMeeting.companyName;
        }
        if (feishuMeeting.expectedAttendance !== undefined) {
          feishuValues["人员汇总.应到人数"] = feishuMeeting.expectedAttendance;
        }
        if (feishuMeeting.actualAttendance !== undefined) {
          feishuValues["人员汇总.实到人数"] = feishuMeeting.actualAttendance;
        }
        const firstProposal = votingContext?.proposals[0];
        if (firstProposal) {
          feishuValues["议案表.议案编号"] = firstProposal.number;
          feishuValues["议案表.议案标题"] = firstProposal.title;
          feishuValues["议案表.议案正文"] = firstProposal.content;
        }
      }

      const meetingPackage = await createMeetingPackage({
        meetingTitle: effectiveTitle,
        meetingType: effectiveType,
        values: { ...feishuValues, ...(values || {}) },
        proposals: votingContext?.proposals || [],
      });
      const packageId = crypto.randomUUID();
      await fs.writeFile(join(meetingPackagesDir, `${packageId}.zip`), meetingPackage.buffer);

      const encodedName = encodeURIComponent(meetingPackage.fileName);
      return res.json({
        success: true,
        meetingId: meetingId || null,
        meetingType: effectiveType,
        fileCount: meetingPackage.fileCount,
        documentNames: meetingPackage.documentNames,
        folderUrl: null,
        archivedToFeishu: false,
        downloadUrl: `/api/meetings/packages/${packageId}?filename=${encodedName}`,
      });
    } catch (error) {
      console.error("生成会议档案失败:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "生成会议档案失败",
      });
    }
  });

  app.get("/api/meetings/packages/:packageId", async (req, res) => {
    const packageId = req.params.packageId;
    if (!/^[0-9a-f-]{36}$/i.test(packageId)) {
      return res.status(400).json({ success: false, error: "下载地址无效" });
    }

    try {
      const file = await fs.readFile(join(meetingPackagesDir, `${packageId}.zip`));
      const requestedName = typeof req.query.filename === "string"
        ? req.query.filename.replace(/[\r\n"]/g, "")
        : "meeting-package.zip";
      const encodedName = encodeURIComponent(requestedName);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="meeting-package.zip"; filename*=UTF-8''${encodedName}`,
      );
      return res.send(file);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return res.status(404).json({ success: false, error: "档案包不存在或服务已重启，请重新生成" });
      }
      console.error("下载会议档案失败:", error);
      return res.status(500).json({ success: false, error: "下载会议档案失败" });
    }
  });

  /** 智谱 GLM 是否已配置（不返回密钥） */
  app.get("/api/llm/status", (_req, res) => {
    const key = process.env.ZHIPU_API_KEY || "";
    res.json({
      provider: "zhipu",
      configured: Boolean(key.trim()),
      defaultModel: process.env.ZHIPU_MODEL || "glm-4-flash",
    });
  });

  /**
   * 服务端代理调用智谱 GLM（密钥仅存在于服务端环境变量 ZHIPU_API_KEY）
   * Body: { message?: string, messages?: { role, content }[], model?: string, temperature?: number }
   */
  app.post("/api/llm/chat", async (req, res) => {
    try {
      const apiKey = process.env.ZHIPU_API_KEY || "";
      if (!apiKey.trim()) {
        return res.status(503).json({
          error: "未配置智谱 API Key",
          hint: "请在项目根目录 .env 中设置 ZHIPU_API_KEY（勿提交到 Git）",
        });
      }

      const { message, messages, model, temperature } = req.body as {
        message?: string;
        messages?: Array<{ role: string; content: string }>;
        model?: string;
        temperature?: number;
      };

      let msgs: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

      if (Array.isArray(messages) && messages.length > 0) {
        for (const m of messages) {
          if (!m?.content || typeof m.content !== "string") continue;
          const role = m.role === "system" || m.role === "assistant" ? m.role : "user";
          msgs.push({ role, content: m.content });
        }
      }

      if (msgs.length === 0 && typeof message === "string" && message.trim()) {
        msgs = [{ role: "user", content: message.trim() }];
      }

      if (msgs.length === 0) {
        return res.status(400).json({
          error: "请提供 message 或 messages",
        });
      }

      const result = await glmChatCompletion({
        apiKey,
        model: model || process.env.ZHIPU_MODEL || "glm-4-flash",
        messages: msgs,
        temperature: typeof temperature === "number" ? temperature : undefined,
      });

      res.json({
        success: true,
        data: {
          content: result.content,
          model: model || process.env.ZHIPU_MODEL || "glm-4-flash",
        },
      });
    } catch (e) {
      console.error("GLM 调用失败:", e);
      res.status(500).json({
        error: e instanceof Error ? e.message : "GLM 调用失败",
      });
    }
  });

  /**
   * 基于当前上传正文执行可回溯的会议合规审查。
   * 文档中不存在的事实只会标记为“无法判断”，不会使用固定演示答案补齐。
   */
  app.post("/api/compliance/review", async (req, res) => {
    try {
      const { content, meetingId } = req.body as {
        content?: string;
        meetingId?: string;
      };

      if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: "没有可审查的文档正文",
        });
      }

      let meetingContext: ComplianceMeetingContext | undefined;
      let feishuWarning = "";

      if (typeof meetingId === "string" && meetingId.trim()) {
        try {
          const bundle = await getFeishuMeetingSourceBundle(meetingId.trim());
          meetingContext = {
            title: bundle.meeting.title,
            type: bundle.meeting.type,
            date: bundle.meeting.date,
            noticeDate: bundle.meeting.noticeDate,
            location: bundle.meeting.location,
            companyName: bundle.meeting.companyName,
            entityType: bundle.meeting.entityType,
            participantNames: bundle.meeting.participantNames,
            expectedAttendance: bundle.meeting.expectedAttendance,
            actualAttendance: bundle.meeting.actualAttendance,
            proposals: bundle.proposals.map((proposal) => proposal.title),
            minutesContent: bundle.minutes.content,
            missingFields: bundle.missingFields,
          };
        } catch (error) {
          feishuWarning =
            error instanceof Error ? error.message : "飞书会议数据读取失败";
        }
      }

      const result = reviewMeetingDocument(content, meetingContext);
      return res.json({
        success: true,
        data: {
          ...result,
          sources: {
            document: true,
            feishu: Boolean(meetingContext),
            feishuWarning,
          },
        },
      });
    } catch (error) {
      console.error("合规审查失败:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "合规审查失败",
      });
    }
  });

  app.get("/api/feishu/automation/compliance-review/status", (_req, res) => {
    res.json({
      success: true,
      endpointReady: true,
      secretConfigured: Boolean(process.env.FEISHU_AUTOMATION_SECRET?.trim()),
      method: "POST",
    });
  });

  /**
   * 飞书多维表格自动化入口。
   * 当“文书表”新增或修改附件时，由飞书自动化向本接口发送记录 ID。
   */
  app.post("/api/feishu/automation/compliance-review", async (req, res) => {
    const configuredSecret = process.env.FEISHU_AUTOMATION_SECRET?.trim() || "";
    const suppliedSecret =
      (typeof req.headers["x-automation-secret"] === "string"
        ? req.headers["x-automation-secret"]
        : "") ||
      (typeof req.body?.secret === "string" ? req.body.secret : "");
    const configuredSecretBuffer = Buffer.from(configuredSecret);
    const suppliedSecretBuffer = Buffer.from(suppliedSecret);
    const secretMatches =
      configuredSecret.length > 0 &&
      suppliedSecretBuffer.length === configuredSecretBuffer.length &&
      crypto.timingSafeEqual(
        suppliedSecretBuffer,
        configuredSecretBuffer,
      );

    if (!configuredSecret) {
      return res.status(503).json({
        success: false,
        error: "Render 尚未配置 FEISHU_AUTOMATION_SECRET",
      });
    }
    if (!secretMatches) {
      return res.status(401).json({
        success: false,
        error: "自动化密钥不正确",
      });
    }

    const documentRecordId =
      typeof req.body?.documentRecordId === "string"
        ? req.body.documentRecordId.trim()
        : typeof req.body?.recordId === "string"
          ? req.body.recordId.trim()
          : "";
    const requestedMeetingId =
      typeof req.body?.meetingRecordId === "string"
        ? req.body.meetingRecordId.trim()
        : "";
    const force = req.body?.force === true;

    if (!documentRecordId) {
      return res.status(400).json({
        success: false,
        error: "缺少 documentRecordId（飞书当前文书记录 ID）",
      });
    }

    let temporaryFilePath = "";
    try {
      const document = await getFeishuDocumentForReview(documentRecordId);
      const currentStatus = JSON.stringify(document.fields["审查状态"] || "");
      if (!force && /审查中|审查完成/.test(currentStatus)) {
        return res.json({
          success: true,
          skipped: true,
          message: currentStatus.includes("审查完成")
            ? "该文书已经审查完成；如需重审请发送 force=true"
            : "该文书正在审查，本次重复触发已忽略",
          documentRecordId,
        });
      }

      await updateFeishuDocumentReview(documentRecordId, { status: "审查中" });

      let content = document.content.trim();
      if (!content && document.attachment) {
        const downloaded = await downloadFeishuBitableAttachment(
          document.attachment.fileToken,
        );
        let extension = path.extname(document.attachment.fileName).toLowerCase();
        if (![".docx", ".doc", ".pdf", ".txt"].includes(extension)) {
          if (downloaded.contentType.includes("pdf")) extension = ".pdf";
          else if (downloaded.contentType.includes("wordprocessingml")) extension = ".docx";
          else if (downloaded.contentType.includes("msword")) extension = ".doc";
          else if (downloaded.contentType.includes("text/plain")) extension = ".txt";
        }
        if (![".docx", ".doc", ".pdf", ".txt"].includes(extension)) {
          throw new Error(`不支持自动审查该附件格式：${extension || downloaded.contentType}`);
        }
        const automationUploadsDir = join(uploadsDir, "automation-review");
        await fs.mkdir(automationUploadsDir, { recursive: true });
        temporaryFilePath = join(
          automationUploadsDir,
          `${crypto.randomUUID()}${extension}`,
        );
        await fs.writeFile(temporaryFilePath, downloaded.buffer);
        content = (await extractDocumentPlainText(temporaryFilePath)).trim();
      }

      if (!content) {
        throw new Error("文书表没有“文书正文”，也没有可下载的 Word、PDF 或 TXT 附件");
      }

      const meetingId = requestedMeetingId || document.meetingId;
      let meetingContext: ComplianceMeetingContext | undefined;
      let feishuMeetingWarning = "";
      if (meetingId) {
        try {
          const bundle = await getFeishuMeetingSourceBundle(meetingId);
          meetingContext = {
            title: bundle.meeting.title,
            type: bundle.meeting.type,
            date: bundle.meeting.date,
            noticeDate: bundle.meeting.noticeDate,
            location: bundle.meeting.location,
            companyName: bundle.meeting.companyName,
            entityType: bundle.meeting.entityType,
            participantNames: bundle.meeting.participantNames,
            expectedAttendance: bundle.meeting.expectedAttendance,
            actualAttendance: bundle.meeting.actualAttendance,
            proposals: bundle.proposals.map((proposal) => proposal.title),
            minutesContent: bundle.minutes.content,
            missingFields: bundle.missingFields,
          };
        } catch (error) {
          feishuMeetingWarning =
            error instanceof Error ? error.message : "关联会议读取失败";
        }
      }

      const review = reviewMeetingDocument(content, meetingContext);
      const update = await updateFeishuDocumentReview(documentRecordId, {
        status: "审查完成",
        score: review.score,
        riskLevel: review.conclusion,
        report: review.markdown,
        riskSummary: review.riskAlerts.join("\n"),
        missingItems: review.missingItems,
      });

      return res.json({
        success: true,
        skipped: false,
        data: {
          documentRecordId,
          meetingRecordId: meetingId,
          documentTitle: document.title,
          score: review.score,
          conclusion: review.conclusion,
          riskCount: review.riskAlerts.length,
          missingCount: review.missingItems.length,
          updatedFields: update.updatedFields,
          missingRecommendedFields: update.missingRecommendedFields,
          feishuMeetingWarning,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "自动审查失败";
      console.error("飞书自动审查失败:", message);
      try {
        await updateFeishuDocumentReview(documentRecordId, {
          status: "审查失败",
          errorMessage: message,
        });
      } catch (writeBackError) {
        console.error("飞书审查失败状态写回失败:", writeBackError);
      }
      return res.status(500).json({
        success: false,
        documentRecordId,
        error: message,
      });
    } finally {
      if (temporaryFilePath) {
        await fs.unlink(temporaryFilePath).catch(() => {});
      }
    }
  });

  // 文件上传接口
  app.post("/api/knowledge/upload", uploadKnowledge.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "没有上传文件" });
      }

      const file = req.file;
      let content: string;
      try {
        content = await extractDocumentPlainText(file.path);
      } catch (parseErr: unknown) {
        console.error("解析文档失败:", parseErr);
        await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({
          error: parseErr instanceof Error ? parseErr.message : "无法解析该文档",
        });
      }

      const title = titleFromDocument(content, file.originalname);

      const knowledgeItem = {
        id: Date.now().toString(),
        title,
        category: "法律法规" as const,
        content: content.substring(0, 500),
        fullContent: content,
        lastModified: new Date().toISOString().split("T")[0],
        status: "已生效" as const,
        filePath: file.path,
        fileName: file.filename,
      };

      res.json({
        success: true,
        message: "文件上传成功",
        data: knowledgeItem,
      });
    } catch (error) {
      console.error("上传失败:", error);
      res.status(500).json({ error: "文件上传失败" });
    }
  });

  // Proxy for Baidu Speech Token (Placeholder for real integration)
  app.get("/api/baidu/token", async (req, res) => {
    // In a real app, you'd call Baidu's token endpoint here
    // const apiKey = process.env.BAIDU_API_KEY;
    // const secretKey = process.env.BAIDU_SECRET_KEY;
    res.json({ token: "mock_baidu_token", expires_in: 2592000 });
  });

  // 腾讯元器智能体 API 代理
  app.post("/api/yuanqi/openapi/v1/agent/chat/completions", async (req, res) => {
    try {
      // 从前端传来的 Authorization 头提取 Bearer Token
      const authHeader = req.headers.authorization || "";
      
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "缺少有效的 Authorization 头" });
      }

      const apiKey = authHeader.replace("Bearer ", "");
      const { assistant_id, user_id, stream, messages } = req.body;

      if (!assistant_id || !user_id || !messages) {
        return res.status(400).json({ error: "缺少必需参数" });
      }

      console.log("正在调用腾讯元器 API, assistant_id:", assistant_id);

      // 创建超时控制器（55秒超时，给前端留点余地）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);

      try {
        // 转发请求到腾讯元器
        const response = await fetch("https://open.hunyuan.tencent.com/openapi/v1/agent/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "X-Source": "openapi"
          },
          body: JSON.stringify({ assistant_id, user_id, stream: stream || false, messages }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log("腾讯元器响应状态:", response.status);

        // 处理流式响应
        if (stream && response.ok) {
          console.log("[Server] 检测到流式响应，开始转发...");
          
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
          });

          const reader = response.body?.getReader();
          if (reader) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
              res.end();
              console.log("[Server] 流式响应转发完成");
            } catch (streamError: any) {
              console.error("[Server] 流式转发错误:", streamError.message);
              if (!res.headersSent) {
                res.status(500).json({ error: "流式传输中断" });
              }
            }
          } else {
            res.status(502).json({ error: "无法读取流式响应体" });
          }
          return;
        }

        // 处理非流式响应
        const data = await response.json();

        if (!response.ok) {
          console.error("腾讯元器 API 错误:", response.status, data);
          return res.status(response.status).json(data);
        }

        console.log("腾讯元器响应成功，数据长度:", JSON.stringify(data).length);
        res.json(data);
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error("元器API调用失败:", error.name, error.message);
        if (error.name === 'AbortError') {
          return res.status(504).json({ error: "请求超时，腾讯元器响应时间过长" });
        }
        throw error;
      }
    } catch (error: any) {
      console.error("元器API调用失败:", error);
      res.status(500).json({
        error: "元器API调用失败",
        details: error.message
      });
    }
  });

  // 腾讯云语音识别 API - 录音文件识别
  app.post("/api/asr/recognize", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "请提供音频文件URL" });
      }

      const result = await callTencentASR(url, null);
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error("语音识别失败:", error);
      res.status(500).json({ 
        error: "语音识别失败", 
        details: error.message 
      });
    }
  });

  // 腾讯云语音识别 API - 录音文件识别（异步）
  app.post("/api/asr/upload", uploadAudio.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "请上传音频文件" });
      }

      console.log("收到音频文件:", req.file.originalname, "大小:", req.file.size);

      // 读取音频文件
      const audioData = await fs.readFile(req.file.path);
      const base64Audio = audioData.toString("base64");

      console.log("正在提交录音文件识别任务...");

      // 直接调用腾讯云 API
      const taskId = await createASRTask(base64Audio, audioData.length);

      console.log("任务创建成功, TaskId:", taskId);

      // 轮询查询识别结果（最多等待 120 秒）
      let resultText = "";
      let retryCount = 0;
      const maxRetries = 120;

      while (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const status = await queryASRTask(taskId);
        console.log("任务状态:", status);

        if (status === 2) {
          // 识别成功，查询结果
          resultText = await getASRResult(taskId);
          break;
        } else if (status === 3) {
          throw new Error("识别任务失败");
        }
        
        retryCount++;
      }

      // 清理临时文件
      await fs.unlink(req.file.path).catch(() => {});

      if (!resultText) {
        resultText = "识别超时，请稍后重试";
      }

      console.log("识别成功!");

      res.json({
        success: true,
        data: {
          text: resultText,
          taskId: taskId
        }
      });
    } catch (error: any) {
      console.error("语音识别失败:", error);
      
      // 清理临时文件
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      
      const errorMsg = error.message || "未知错误";
      res.status(500).json({ 
        error: "语音识别失败", 
        details: errorMsg
      });
    }
  });

  // 创建 ASR 任务
  async function createASRTask(base64Data: string, dataLen: number): Promise<number> {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const payload = {
      EngineModelType: "16k_zh",
      ChannelNum: 1,
      ResTextFormat: 0,
      SourceType: 1,
      Data: base64Data,
      DataLen: dataLen
    };

    const response = await callTencentAPI("CreateRecTask", payload, timestamp);
    return response.Response.TaskId;
  }

  // 查询 ASR 任务状态
  async function queryASRTask(taskId: number): Promise<number> {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const payload = {
      TaskId: taskId
    };

    const response = await callTencentAPI("DescribeTaskStatus", payload, timestamp);
    return response.Response.Status;
  }

  // 获取 ASR 识别结果
  async function getASRResult(taskId: number): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const payload = {
      TaskId: taskId
    };

    const response = await callTencentAPI("DescribeTaskStatus", payload, timestamp);
    const result = response.Response;
    
    if (result.ResultDetail && result.ResultDetail.length > 0) {
      return result.ResultDetail.map((r: any) => r.Text).join("\n");
    }
    return result.Result || "识别完成";
  }

  // 调用腾讯云 API（使用 TC3-HMAC-SHA256 签名）
  async function callTencentAPI(action: string, payload: any, timestamp: number) {
    const service = "asr";
    const host = "asr.ap-guangzhou.tencentcloudapi.com";
    const version = "2019-06-14";
    const region = "ap-guangzhou";

    // 计算签名
    const secretId = TENCENT_SECRET_ID;
    const secretKey = TENCENT_SECRET_KEY;

    const httpRequestMethod = "POST";
    const canonicalUri = "/";
    const canonicalQueryString = "";
    const timestampStr = timestamp.toString();
    const date = new Date(timestamp * 1000).toISOString().split("T")[0];

    // 构造 canonical Request
    const hashedRequestPayload = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const canonicalHeaders = `content-type:application/json\nhost:${host}\n`;
    const signedHeaders = "content-type;host";
    const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

    // 计算 string to sign
    const algorithm = "TC3-HMAC-SHA256";
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = crypto.createHash("sha256").update(canonicalRequest).digest("hex");
    const stringToSign = `${algorithm}\n${timestampStr}\n${credentialScope}\n${hashedCanonicalRequest}`;

    // 计算签名
    const secretDate = crypto.createHmac("sha256", `TC3${secretKey}`).update(date).digest("hex");
    const secretService = crypto.createHmac("sha256", secretDate).update(service).digest("hex");
    const secretSigning = crypto.createHmac("sha256", secretService).update("tc3_request").digest("hex");
    const signature = crypto.createHmac("sha256", secretSigning).update(stringToSign).digest("hex");

    // 构造 authorization
    const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // 发送请求
    const response = await fetch(`https://${host}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorization,
        "Host": host,
        "X-TC-Action": action,
        "X-TC-Version": version,
        "X-TC-Timestamp": timestampStr,
        "X-TC-Region": region
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.Response?.Error) {
      throw new Error(`${action} failed: ${data.Response.Error.Message}`);
    }

    return data;
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
