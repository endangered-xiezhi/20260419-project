# 团队协作文档索引

本目录包含了 4 人团队协作开发所需的所有文档和工具。

---

## 📚 文档结构

### 1. 核心文档

| 文件 | 用途 | 目标读者 |
|------|------|----------|
| **[README.md](../README.md)** | 项目介绍和快速开始 | 所有人 |
| **[TEAM_COLLABORATION.md](./TEAM_COLLABORATION.md)** | 完整协作指南（20 页） | 所有人 |
| **[PROJECT_BOARD.md](./PROJECT_BOARD.md)** | 项目看板和任务分配 | 负责人、所有成员 |
| **[QUICK_START_COLLAB.md](./QUICK_START_COLLAB.md)** | 快速启动指南（首次阅读） | 新成员 |
| **[COLLABORATION_SETUP_SUMMARY.md](./COLLABORATION_SETUP_SUMMARY.md)** | 配置完成总结 | 负责人 |

---

### 2. 模板文件

| 文件 | 用途 | 使用场景 |
|------|------|----------|
| **[.github/ISSUE_TEMPLATE/feature_request.yml](../.github/ISSUE_TEMPLATE/feature_request.yml)** | 功能请求模板 | 提出新功能建议时 |
| **[.github/ISSUE_TEMPLATE/bug_report.yml](../.github/ISSUE_TEMPLATE/bug_report.yml)** | Bug 报告模板 | 发现 Bug 时 |
| **[.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md)** | PR 模板 | 提交 Pull Request 时 |

---

### 3. 配置文件

| 文件 | 用途 | 说明 |
|------|------|------|
| **[.env.example](../.env.example)** | 环境变量模板 | 复制为 .env 并填入真实 Key |
| **[.gitignore](../.gitignore)** | Git 忽略规则 | 不要提交 node_modules 等 |

---

## 🚀 新成员快速上手（5 分钟）

### 第 1 步：阅读快速启动指南
```bash
# 打开快速启动文档
cat QUICK_START_COLLAB.md
```
👉 内容：环境准备、克隆项目、启动开发服务器

### 第 2 步：克隆并配置项目
```bash
git clone <repository-url>
cd sanhuiapp
npm install
cp .env.example .env
# 编辑 .env 填入 API Key
npm run dev
```

### 第 3 步：了解角色分工
查看 [TEAM_COLLABORATION.md](./TEAM_COLLABORATION.md) 的"角色分配"部分

### 第 4 步：开始开发
```bash
git checkout develop
git checkout -b feature/your-feature
# 开始编码...
```

---

## 📖 阅读路径建议

### 首次参与项目
```
README.md（../README.md）
   ↓
QUICK_START_COLLAB.md
   ↓
TEAM_COLLABORATION.md（详细规范）
```

### 日常开发参考
```
PROJECT_BOARD.md（任务分配）
   ↓
TEAM_COLLABORATION.md（代码规范）
   ↓
README.md（技术文档）
```

### 遇到问题
```
QUICK_START_COLLAB.md（常见问题）
   ↓
TEAM_COLLABORATION.md（冲突解决）
   ↓
创建 Issue（使用模板）
```

---

## 📊 文档详细对比

### README.md vs TEAM_COLLABORATION.md

| 维度 | README.md | TEAM_COLLABORATION.md |
|------|-----------|---------------------|
| 页数 | 1 页 | 20 页 |
| 内容 | 项目概览、技术栈、快速开始 | 完整协作流程、规范、角色分工 |
| 使用频率 | 每次查看项目 | 开发前查看规范 |
| 目标读者 | 所有人（包括外部） | 团队内部 |

### PROJECT_BOARD.md vs 团队分工表

| 维度 | PROJECT_BOARD.md | 团队分工表 |
|------|-----------------|------------|
| 内容 | Sprint 计划、任务清单、进度跟踪 | 静态的角色和模块划分 |
| 更新频率 | 每周更新 | 初期确定后基本不变 |
| 使用场景 | 日常站会、进度回顾 | 新成员了解分工 |

---

## 🎯 按场景查找文档

### 我想开始新功能开发
→ 查看 [TEAM_COLLABORATION.md](./TEAM_COLLABORATION.md) 的"模块划分"部分

### 我想了解当前进度
→ 查看 [PROJECT_BOARD.md](./PROJECT_BOARD.md) 的"当前阶段"

### 我遇到了 Git 冲突
→ 查看 [QUICK_START_COLLAB.md](./QUICK_START_COLLAB.md) 的"常见问题"

### 我想报告 Bug
→ 创建 Issue，选择 [Bug 报告模板](../.github/ISSUE_TEMPLATE/bug_report.yml)

### 我想提交代码
→ 查看 [QUICK_START_COLLAB.md](./QUICK_START_COLLAB.md) 的"日常开发流程"

### 我想知道代码规范
→ 查看 [TEAM_COLLABORATION.md](./TEAM_COLLABORATION.md) 的"代码规范"部分

### 我想创建 Pull Request
→ 查看 [PR 模板](../.github/PULL_REQUEST_TEMPLATE.md)

---

## 🔄 文档更新流程

### 何时更新 PROJECT_BOARD.md
- 完成 Sprint 目标后
- 新增或修改任务时
- 阻塞问题解决后

### 何时更新 TEAM_COLLABORATION.md
- 团队分工调整时
- 开发流程优化时
- 发现规范问题时

### 何时更新 README.md
- 新增核心功能时
- 技术栈变更时
- API 接口文档更新时

---

## 💡 最佳实践

1. **先阅读，后动手**
   - 开发前阅读相关规范文档
   - 避免因不了解规范导致的返工

2. **及时更新文档**
   - 完成任务后更新 PROJECT_BOARD.md
   - 发现问题后更新协作指南

3. **善用模板**
   - Issue 使用模板可以更快解决问题
   - PR 使用模板可以加速审查流程

4. **定期同步**
   - 每周一次文档审查会议
   - 确保文档与实际开发保持一致

---

## 📞 需要帮助？

### 文档问题
→ 在团队群中提出，@ 负责人

### 使用建议
→ 在团队会议中提出，集体讨论改进

### 发现错误
→ 提交 PR 修复，或创建 Issue 标记"文档"

## 📁 文件位置说明

- **协作文档**：`./docs/` 目录
- **配置文件**：项目根目录
- **源代码**：`./src/` 目录
- **GitHub 模板**：`./.github/` 目录

---

**最后更新：** 2026-03-31
**维护者：** 项目负责人
