# AI Governance System (智理科技 - AI 治理系统)

这是一个基于 AI 驱动的企业治理平台，旨在通过智能化手段优化会议管理、合规审查及文书生成流程。

## 核心功能 (Core Features)

- **仪表盘 (Dashboard):** 实时监控会议状态、合规健康度及文书生成进度。
- **会议管理 (Meeting Manager):** 全生命周期跟踪股东大会、董事会及监事会会议。
- **录音工作台 (Recording Workspace):** 集成实时 ASR 转写与 AI 深度分析，自动识别合规风险。
- **合规审查 (Compliance Review):** 基于 RAG 技术检索最新法律法规（如 2024 新公司法），提供穿透式风险拦截。
- **文书中心 (Document Center):** AI 一键生成标准合规的三会档案，支持在线编辑与实时预览。
- **人员矩阵 (Personnel Matrix):** 动态管理董监高成员任期、独立性及关联关系声明。
- **知识库 (Knowledge Base):** 支持 .docx/.pdf 格式法律文件上传与向量化检索。

## 技术栈 (Tech Stack)

- **前端框架:** React + Vite
- **样式处理:** Tailwind CSS (McKinsey/Corporate Style)
- **图标库:** Lucide React
- **AI 引擎:** Google Gemini API (@google/genai)
- **文档解析:** Mammoth.js
- **数据持久化:** 浏览器 `localStorage` (轻量级、无感同步)

## 快速开始 (Quick Start)

1. **安装依赖:**
   ```bash
   npm install
   ```

2. **配置环境变量:**
   在根目录创建 `.env` 文件并添加您的 Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

3. **启动开发服务器:**
   ```bash
   npm run dev
   ```

## 数据存储说明 (Data Persistence)

系统采用 `localStorage` 进行本地化存储，确保在切换标签页或刷新页面时数据不会丢失。您可以在"系统设置"中管理或重置这些本地数据。

## 团队协作 (Team Collaboration)

本项目由 4 名同学协同开发，详细的协作指南请查看：

- **[协作文档索引](./docs/COLLABORATION_INDEX.md)** - 快速找到所需文档
- **[团队协作指南](./docs/TEAM_COLLABORATION.md)** - 完整的角色分配、Git 工作流和开发规范
- **[项目管理看板](./docs/PROJECT_BOARD.md)** - 实时任务分配和进度跟踪
- **[快速启动指南](./docs/QUICK_START_COLLAB.md)** - 新成员 5 分钟上手教程

## 项目文档 (Project Documentation)

完整的项目文档位于 `docs` 文件夹：

- **[PRD - 产品需求文档](./docs/PRD.md)** - 功能需求、用户体验、商业模式、竞品分析
- **[TRD - 技术需求文档](./docs/TRD.md)** - 技术架构、API 设计、数据库设计、安全方案
- **[文档索引](./docs/README.md)** - 所有文档的总目录

### 快速上手协作

1. **克隆项目并配置环境**
   ```bash
   git clone <repository-url>
   cd sanhuiapp
   npm install
   cp .env.example .env  # 配置环境变量
   npm run dev
   ```

2. **创建功能分支**
   ```bash
   git checkout develop
   git checkout -b feature/your-feature-name
   ```

3. **开发并提交**
   ```bash
   git add .
   git commit -m "feat: add meeting creation dialog"
   git push origin feature/your-feature-name
   ```

4. **创建 Pull Request**
   - 在 GitHub 创建 PR
   - 填写 PR 模板
   - 等待代码审查
   - 合并到 `develop` 分支

### 角色分工

| 角色 | 负责人 | 主要职责 |
|------|--------|----------|
| 项目负责人 | 同学 A | 架构设计、代码审查、技术攻关 |
| 前端开发 | 同学 B | UI/UX、组件开发、样式管理 |
| 后端 & AI | 同学 C | API 开发、服务器配置、AI 集成 |
| 测试 & 文档 | 同学 D | 功能测试、Bug 修复、文档编写 |

详细的模块划分和任务分配请查看 [PROJECT_BOARD.md](./docs/PROJECT_BOARD.md)。

## 开发规范 (Development Standards)

### 提交信息规范 (Conventional Commits)

```bash
feat: 新功能
fix: Bug 修复
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

示例：
```bash
git commit -m "feat(meeting): add meeting creation form"
git commit -m "fix(recording): resolve scrollRef null error"
```

### 代码审查要点

- [ ] 代码风格是否一致
- [ ] 是否有潜在 Bug
- [ ] 是否符合项目规范
- [ ] 是否需要添加注释
- [ ] 通过 TypeScript 类型检查 (`npm run lint`)

## 问题反馈 (Issue Reporting)

遇到 Bug 或有新功能建议？请创建 Issue：

- **[报告 Bug](../../issues/new?template=bug_report.yml)** - 使用 Bug 报告模板
- **[功能建议](../../issues/new?template=feature_request.yml)** - 使用功能请求模板

## 联系方式 (Contact)

如有问题，请通过以下方式联系团队：

- **协作文档索引:** [COLLABORATION_INDEX.md](./docs/COLLABORATION_INDEX.md)
- **团队协作指南:** [TEAM_COLLABORATION.md](./docs/TEAM_COLLABORATION.md)
- **项目管理看板:** [PROJECT_BOARD.md](./docs/PROJECT_BOARD.md)
- **快速启动指南:** [QUICK_START_COLLAB.md](./docs/QUICK_START_COLLAB.md)
- **Issues:** [GitHub Issues](../../issues)

---

**最后更新：** 2026-03-31
**当前版本：** 0.0.0
**开发状态：** 活跃开发中

