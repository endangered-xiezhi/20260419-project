# TRD - 技术需求文档

## 技术需求文档 (Technical Requirements Document)

**项目名称：** 智理·三会 - 企业三会治理AI系统
**文档版本：** v1.0
**创建日期：** 2026-03-31
**文档状态：** 正式发布

---

## 📋 目录

1. [技术架构](#技术架构)
2. [技术栈选型](#技术栈选型)
3. [数据库设计](#数据库设计)
4. [API 接口设计](#api-接口设计)
5. [AI 技术方案](#ai-技术方案)
6. [安全设计](#安全设计)
7. [性能优化](#性能优化)
8. [部署方案](#部署方案)
9. [测试方案](#测试方案)
10. [运维监控](#运维监控)

---

## 技术架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                                │
│  Web 浏览器 (Chrome, Edge, Safari, Firefox)                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                         前端层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   React 19   │  │  Tailwind    │  │   Vite 6     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ TypeScript  │  │ Framer Motion│  │ Lucide Icons │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                       后端服务层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Express.js  │  │  中间件      │  │  路由管理    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────┬────────────────────────────────────┘
                         │
      ┌──────────────────┼──────────────────┐
      ↓                  ↓                  ↓
┌──────────┐      ┌──────────┐      ┌──────────┐
│ AI 服务  │      │ 语音服务 │      │ 数据存储 │
│ (Gemini) │      │ (百度)   │      │(浏览器)  │
└──────────┘      └──────────┘      └──────────┘
```

### 分层说明

#### 1. 前端层
- **框架：** React 19
- **状态管理：** React Hooks + Context API
- **路由：** React Router (如需要)
- **样式：** Tailwind CSS
- **动画：** Framer Motion
- **图标：** Lucide React
- **构建工具：** Vite

#### 2. 后端层
- **框架：** Express.js
- **运行时：** Node.js
- **中间件：**
  - CORS
  - Body Parser
  - 日志记录
  - 错误处理
- **开发服务器：** Vite Dev Server

#### 3. AI 服务层
- **主要 AI 引擎：** Google Gemini
- **备用 AI 引擎：** DeepSeek
- **向量检索：** RAG 技术

#### 4. 外部服务
- **语音识别：** 百度语音识别 API
- **数据存储：** 浏览器 localStorage
- **文档解析：** Mammoth.js (Word)

---

## 技术栈选型

### 前端技术栈

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| **React** | 19.0.0 | 最新稳定版本，性能优秀，生态成熟 |
| **TypeScript** | 5.8.2 | 类型安全，减少运行时错误 |
| **Vite** | 6.2.0 | 极快的开发体验，优秀的 HMR |
| **Tailwind CSS** | 4.1.14 | 实用优先，开发效率高，体积小 |
| **Framer Motion** | 12.38.0 | 强大的动画库，API 简洁 |
| **Lucide React** | 0.546.0 | 轻量级图标库，风格统一 |

### 后端技术栈

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| **Node.js** | 24.14.1 | 最新 LTS 版本，性能优异 |
| **Express.js** | 4.21.2 | 轻量级，生态成熟 |
| **dotenv** | 17.2.3 | 环境变量管理 |
| **tsx** | 4.21.0 | TypeScript 执行器 |

### AI & 工具库

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| **@google/genai** | 1.29.0 | Google 官方 SDK，功能强大 |
| **mammoth** | 1.12.0 | Word 文档解析，支持中文 |
| **clsx** | 2.1.1 | 条件类名工具 |
| **tailwind-merge** | 3.5.0 | Tailwind 类名合并 |
| **date-fns** | 4.1.0 | 日期处理，轻量级 |

---

## 数据库设计

### 数据存储方案
**当前版本：** 浏览器 `localStorage`
**后续版本：** 云数据库 (Supabase / MongoDB)

### localStorage 数据结构

#### 1. 会议数据 (corporate_meetings_list)
```json
[
  {
    "id": "1",
    "title": "2026年第一次临时股东大会",
    "type": "股东会",
    "date": "2026-04-10",
    "time": "09:00",
    "location": "公司总部会议室A",
    "status": "筹备中",
    "complianceScore": 98,
    "notifiedDays": 11,
    "attendees": ["张三", "李四", "王五"],
    "agenda": [
      {
        "id": "a1",
        "title": "审议2025年度财务报告",
        "content": "..."
      }
    ],
    "attachments": [],
    "createdAt": "2026-03-30T10:00:00Z",
    "updatedAt": "2026-03-30T10:00:00Z"
  }
]
```

#### 2. 语音转写数据 (corporate_asr_segments_{meetingId})
```json
[
  {
    "id": "1",
    "speaker": "王董事长",
    "role": "董事长",
    "text": "各位董事，现在开始审议关于公司向银行申请5000万元授信的议案。",
    "timestamp": "10:00:05",
    "confidence": 0.98,
    "createdAt": "2026-03-30T10:00:05Z"
  }
]
```

#### 3. AI 分析结果 (corporate_analysis_result_{meetingId})
```json
{
  "meetingId": "1",
  "result": "会议合规性分析报告...",
  "issues": [
    {
      "id": "i-1",
      "type": "实质性",
      "title": "资产负债率预警",
      "description": "独立董事提出的65%负债率可能触及内部风控红线。",
      "lawReference": "《公司章程》第82条",
      "severity": "medium",
      "status": "待处理",
      "createdAt": "2026-03-30T10:00:00Z"
    }
  ],
  "generatedAt": "2026-03-30T10:00:00Z"
}
```

#### 4. 合规风险列表 (corporate_compliance_issues)
```json
[
  {
    "id": "i-1",
    "meetingId": "1",
    "type": "实质性",
    "title": "资产负债率预警",
    "description": "独立董事提出的65%负债率可能触及内部风控红线。",
    "lawReference": "《公司章程》第82条",
    "severity": "medium",
    "status": "待处理",
    "createdAt": "2026-03-30T10:00:00Z"
  }
]
```

#### 5. 法律文件库 (corporate_knowledge_base)
```json
[
  {
    "id": "k1",
    "title": "中华人民共和国公司法 (2024修订)",
    "category": "法律法规",
    "content": "第一百一十一条：董事会会议，应于会议召开十日前通知全体董事和监事...",
    "lastModified": "2024-01-01",
    "status": "已生效",
    "vector": [0.123, 0.456, ...], // 向量化表示
    "createdAt": "2026-03-30T10:00:00Z"
  }
]
```

#### 6. 生成的文书 (corporate_generated_documents)
```json
[
  {
    "id": "doc-1",
    "meetingId": "1",
    "type": "会议通知",
    "title": "2026年第一次临时股东大会会议通知",
    "content": "...",
    "format": "pdf",
    "generatedAt": "2026-03-30T10:00:00Z",
    "generatedBy": "AI"
  }
]
```

#### 7. 人员矩阵 (corporate_personnel)
```json
[
  {
    "id": "p-1",
    "name": "张三",
    "gender": "男",
    "age": 45,
    "position": "董事长",
    "type": "董事",
    "isIndependent": false,
    "termStart": "2024-01-01",
    "termEnd": "2027-01-01",
    "email": "zhangsan@example.com",
    "phone": "138****1234",
    "relationships": [
      {
        "type": "亲属",
        "relatedPerson": "李四（董事）",
        "relation": "兄弟"
      }
    ],
    "createdAt": "2026-03-30T10:00:00Z"
  }
]
```

#### 8. 系统设置 (corporate_ai_settings)
```json
{
  "baiduApiKey": "****",
  "baiduSecretKey": "****",
  "deepseekApiKey": "****",
  "geminiApiKey": "****",
  "ragThreshold": 0.75,
  "autoSync": true,
  "updatedAt": "2026-03-30T10:00:00Z"
}
```

---

## API 接口设计

### 基础信息
- **Base URL:** `http://localhost:3000`
- **协议:** HTTP (开发) / HTTPS (生产)
- **数据格式:** JSON
- **字符编码:** UTF-8

### API 列表

#### 1. 健康检查
```http
GET /api/health
```

**响应：**
```json
{
  "status": "ok",
  "timestamp": "2026-03-30T10:00:00Z"
}
```

#### 2. 获取百度语音 Token
```http
GET /api/baidu/token
```

**响应：**
```json
{
  "token": "mock_baidu_token",
  "expires_in": 2592000
}
```

#### 3. 会议管理

##### 3.1 获取会议列表
```http
GET /api/meetings?filterType=ALL&status=all
```

**响应：**
```json
{
  "data": [
    {
      "id": "1",
      "title": "2026年第一次临时股东大会",
      "type": "股东会",
      "date": "2026-04-10",
      "status": "筹备中",
      "complianceScore": 98
    }
  ],
  "total": 3
}
```

##### 3.2 创建会议
```http
POST /api/meetings
Content-Type: application/json

{
  "title": "2026年第二次董事会会议",
  "type": "董事会",
  "date": "2026-05-10",
  "location": "公司总部会议室B",
  "agenda": [...]
}
```

**响应：**
```json
{
  "id": "2",
  "message": "会议创建成功"
}
```

##### 3.3 更新会议
```http
PUT /api/meetings/:id
Content-Type: application/json

{
  "title": "更新后的会议名称",
  "status": "进行中"
}
```

##### 3.4 删除会议
```http
DELETE /api/meetings/:id
```

#### 4. 语音转写

##### 4.1 上传音频
```http
POST /api/asr/upload
Content-Type: multipart/form-data

file: <audio-file>
```

##### 4.2 开始转写
```http
POST /api/asr/start?meetingId=1
```

##### 4.3 获取转写结果
```http
GET /api/asr/segments?meetingId=1
```

**响应：**
```json
{
  "data": [
    {
      "id": "1",
      "speaker": "王董事长",
      "role": "董事长",
      "text": "...",
      "timestamp": "10:00:05"
    }
  ]
}
```

#### 5. AI 分析

##### 5.1 启动合规审查
```http
POST /api/ai/analyze
Content-Type: application/json

{
  "meetingId": "1",
  "segments": [...],
  "knowledgeBase": [...]
}
```

**响应：**
```json
{
  "result": "分析报告...",
  "issues": [
    {
      "id": "i-1",
      "type": "实质性",
      "title": "...",
      "description": "...",
      "severity": "medium"
    }
  ]
}
```

#### 6. 文书生成

##### 6.1 生成文书
```http
POST /api/documents/generate
Content-Type: application/json

{
  "meetingId": "1",
  "type": "会议通知",
  "templateId": "tpl-1"
}
```

##### 6.2 下载文书
```http
GET /api/documents/:id/download
```

#### 7. 知识库

##### 7.1 上传法律文件
```http
POST /api/knowledge/upload
Content-Type: multipart/form-data

file: <docx-file>
category: "法律法规"
```

##### 7.2 检索知识库
```http
GET /api/knowledge/search?q=公司法第111条&limit=10
```

**响应：**
```json
{
  "data": [
    {
      "id": "k1",
      "title": "中华人民共和国公司法 (2024修订)",
      "category": "法律法规",
      "content": "...",
      "score": 0.95
    }
  ]
}
```

#### 8. 人员管理

##### 8.1 获取人员列表
```http
GET /api/personnel?type=董事
```

##### 8.2 添加人员
```http
POST /api/personnel
Content-Type: application/json

{
  "name": "张三",
  "position": "董事长",
  "type": "董事",
  "termStart": "2024-01-01",
  "termEnd": "2027-01-01"
}
```

---

## AI 技术方案

### 1. 语音识别 (ASR)

#### 技术选型
- **服务商：** 百度语音识别
- **API：** REST API / WebSocket 实时识别
- **支持格式：** PCM, WAV, OPUS
- **采样率：** 16000 Hz

#### 实现方案
```typescript
// 实时语音转写流程
1. 用户点击"开始录音"
2. 浏览器调用 MediaRecorder API 录制音频
3. 定期将音频分片上传到服务器
4. 服务器调用百度 ASR API 转写
5. 返回转写结果并实时显示
6. AI 分析转写内容
```

#### 角色识别
```typescript
// 声纹识别（可选）
1. 收集不同角色的语音样本
2. 训练声纹模型
3. 实时识别发言人
4. 结合语义分析优化识别结果
```

### 2. AI 文本分析

#### 技术选型
- **主引擎：** Google Gemini 3 Flash
- **备用引擎：** DeepSeek V3
- **SDK：** @google/genai

#### RAG (Retrieval-Augmented Generation)

```typescript
// RAG 实现流程
1. 用户输入查询或会议内容
2. 向量化查询内容
3. 在法律文件库中检索相关条款
4. 构建包含法律依据的 Prompt
5. 调用 AI 模型生成分析结果
6. 返回带引用的合规报告
```

#### Prompt 设计
```
系统指令：
你是一个专业的企业治理AI助手，擅长法律风险穿透和合规文书生成。

用户请求：
分析以下会议记录的合规性。

【本地法律规章库 (RAG Context)】:
{ragContext}

【当前会议记录】:
{meetingTranscript}

要求：
1. 严格参考【本地法律规章库】中的条款进行合规性识别。
2. 识别潜在的法律风险。
3. 提取议案核心要素。
4. 给出合规建议。

输出格式：
## 思考链路
（展示分析思路）

## 合规检查结果
- 通知期限：✅/❌
- 出席比例：✅/❌
- 表决权计算：✅/❌

## 风险清单
1. [风险类型] - 风险描述
   - 法律依据：《公司法》第X条
   - 严重程度：High/Medium/Low
   - 整改建议：...

## 决议要素提取
- 议题1：...
- 表决结果：...
```

### 3. 文书生成

#### 模板引擎
```typescript
// 文书生成流程
1. 从会议数据中提取关键信息
2. 根据文书类型选择模板
3. 填充模板变量
4. AI 优化内容表述
5. 生成最终文档
6. 导出为 Word/PDF
```

#### 模板示例
```
# 会议通知模板

{{companyName}}

{{documentTitle}}

会议编号：{{meetingId}}
会议类型：{{meetingType}}

各位{{attendeeType}}：

兹定于{{meetingDate}}{{meetingTime}}，
在{{location}}召开{{meetingTitle}}。

会议议题：
{{#each agenda}}
{{@index}}. {{this.title}}
   {{this.content}}
{{/each}}

请各位准时参会。

特此通知。

{{companyName}}
{{date}}
```

---

## 安全设计

### 1. 前端安全

#### XSS 防护
- 使用 React 的自动 XSS 防护
- 用户输入进行转义处理
- CSP (Content Security Policy) 配置

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
```

#### CSRF 防护
- 使用 SameSite Cookie
- 添加 CSRF Token

### 2. 后端安全

#### API 安全
- CORS 配置限制
- 请求频率限制 (Rate Limiting)
- 输入验证和清理

```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true
}));
```

#### 环境变量保护
```typescript
// 不要将 .env 文件提交到 Git
// 使用 .env.example 作为模板
GEMINI_API_KEY=your_api_key_here
```

### 3. 数据安全

#### 加密存储
```typescript
// API Key 加密存储
const encryptedKey = encrypt(apiKey, userSecret);
localStorage.setItem('apiKey', encryptedKey);
```

#### 数据备份
```typescript
// 定期备份 localStorage 数据
const backupData = JSON.stringify(localStorage);
localStorage.setItem('backup_' + Date.now(), backupData);
```

---

## 性能优化

### 1. 前端优化

#### 代码分割
```typescript
// 动态导入组件
const RecordingWorkspace = lazy(() => import('./components/RecordingWorkspace'));

<Suspense fallback={<Loading />}>
  <RecordingWorkspace />
</Suspense>
```

#### 图片优化
- 使用 WebP 格式
- 响应式图片
- 懒加载

#### 缓存策略
```typescript
// Service Worker 缓存静态资源
// localStorage 缓存业务数据
```

### 2. 后端优化

#### API 响应时间
- 目标：p95 < 200ms
- 使用缓存减少数据库查询
- 异步处理耗时任务

#### 并发处理
```typescript
// 使用异步处理 AI 请求
app.post('/api/ai/analyze', async (req, res) => {
  const jobId = generateJobId();
  queue.add(jobId, req.body);
  res.json({ jobId, status: 'pending' });
});
```

### 3. AI 优化

#### 模型选择
- 使用轻量级模型 (Gemini 3 Flash)
- 批量处理减少 API 调用
- 缓存常见查询结果

---

## 部署方案

### 开发环境

#### 本地开发
```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动开发服务器
npm run dev
```

#### 访问地址
- 前端：http://localhost:3000
- 后端：http://localhost:3000

### 生产环境

#### 部署选项

##### 选项 1：Vercel / Netlify（推荐）
- 优点：零配置、自动 HTTPS、CDN 加速
- 缺点：后端需要单独部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

##### 选项 2：Docker + Nginx
- 优点：完全控制、可扩展
- 缺点：配置复杂

```dockerfile
# Dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

##### 选项 3：云服务器（腾讯云/阿里云）
- 优点：完全控制、适合企业
- 缺点：需要运维

#### CI/CD 流程
```yaml
# GitHub Actions 示例
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '24'
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Deploy
        run: vercel --prod
```

---

## 测试方案

### 1. 单元测试

#### 测试框架
- **框架：** Vitest
- **断言：** @vitest/expect
- **覆盖率：** @vitest/coverage

#### 测试示例
```typescript
import { describe, it, expect } from 'vitest';
import { calculateComplianceScore } from './utils';

describe('calculateComplianceScore', () => {
  it('should return 100 for fully compliant meeting', () => {
    const meeting = {
      notifiedDays: 15,
      attendanceRate: 1.0,
    };
    expect(calculateComplianceScore(meeting)).toBe(100);
  });

  it('should reduce score for late notification', () => {
    const meeting = {
      notifiedDays: 5,
      attendanceRate: 1.0,
    };
    expect(calculateComplianceScore(meeting)).toBeLessThan(100);
  });
});
```

### 2. 集成测试

#### E2E 测试框架
- **框架：** Playwright
- **测试场景：**
  - 创建会议
  - 开始录音
  - 生成文书
  - 查看报告

```typescript
import { test, expect } from '@playwright/test';

test('create meeting workflow', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=会议管理');
  await page.click('text=发起新会议');
  await page.fill('[name="title"]', '测试会议');
  await page.click('button:has-text("创建")');
  await expect(page.locator('text=会议创建成功')).toBeVisible();
});
```

### 3. 性能测试

#### 测试工具
- **Load Testing：** k6
- **性能监控：** Lighthouse

```javascript
// k6 性能测试示例
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.get('http://localhost:3000/api/meetings');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

---

## 运维监控

### 1. 日志管理

#### 日志级别
- **ERROR:** 严重错误
- **WARN:** 警告信息
- **INFO:** 一般信息
- **DEBUG:** 调试信息

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### 2. 监控指标

#### 关键指标
- **系统健康度：** API 可用性
- **响应时间：** p50, p95, p99
- **错误率：** HTTP 5xx 错误比例
- **并发数：** 同时在线用户数

#### 监控工具
- **应用监控：** Sentry
- **性能监控：** Google Analytics
- **服务器监控：** CloudWatch / 阿里云监控

### 3. 告警机制

#### 告警规则
- API 错误率 > 5%
- 响应时间 p95 > 1s
- 服务器 CPU > 80%
- 磁盘空间 < 20%

#### 告警方式
- 邮件通知
- 短信通知
- 企业微信/钉钉机器人

---

## 附录

### A. 技术术语表
- **RAG:** Retrieval-Augmented Generation，检索增强生成
- **ASR:** Automatic Speech Recognition，自动语音识别
- **HMR:** Hot Module Replacement，热模块替换
- **SSR:** Server-Side Rendering，服务端渲染
- **CSR:** Client-Side Rendering，客户端渲染

### B. 参考文档
- [React 官方文档](https://react.dev)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Vite 文档](https://vitejs.dev)
- [Google Gemini API 文档](https://ai.google.dev/docs)
- [百度语音识别 API 文档](https://ai.baidu.com/ai-doc/SPEECH/Vk38lxily)

### C. 相关文档
- [PRD.md](./PRD.md) - 产品需求文档
- [TEAM_COLLABORATION.md](./TEAM_COLLABORATION.md) - 团队协作指南
- [PROJECT_BOARD.md](./PROJECT_BOARD.md) - 项目看板

---

**文档维护者：** 技术团队
**审核人：** 项目负责人
**最后更新：** 2026-03-31
