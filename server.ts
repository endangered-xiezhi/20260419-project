import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";
import { extractDocumentPlainText, titleFromDocument } from "./lib/knowledgeExtract.js";

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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  // 初始化腾讯云 SDK
  await initTencentSDK();
  console.log("腾讯云 SDK 初始化完成");

  const app = express();
  const PORT = 3001;

  app.use(express.json());

  // 创建上传目录
  const uploadsDir = join(__dirname, "uploads");
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }

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
