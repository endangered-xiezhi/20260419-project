# 团队协作开发指南

## 项目概述
**项目名称：** 智理·三会 - 企业三会治理AI系统
**团队规模：** 4名同学
**技术栈：** React + TypeScript + Vite + Tailwind CSS

---

## 📋 目录

1. [角色分配](#角色分配)
2. [开发流程](#开发流程)
3. [Git 工作流](#git-工作流)
4. [代码规范](#代码规范)
5. [模块划分](#模块划分)
6. [环境配置](#环境配置)
7. [沟通协作](#沟通协作)
8. [冲突解决](#冲突解决)

---

## 👥 角色分配

### 同学 A - 项目负责人
- **职责：**
  - 整体架构设计
  - 代码审查 (Code Review)
  - 合并请求 (PR) 审核
  - 技术难点攻关
- **负责模块：** Dashboard、App 核心逻辑

### 同学 B - 前端开发
- **职责：**
  - UI/UX 实现
  - 组件开发
  - 样式管理 (Tailwind CSS)
  - 响应式布局
- **负责模块：** MeetingManager、DocumentCenter、Dashboard 组件

### 同学 C - 后端 & AI 集成
- **职责：**
  - API 接口开发
  - 服务器配置
  - AI 模型集成 (Gemini/DeepSeek)
  - 数据存储方案
- **负责模块：** server.ts、RecordingWorkspace、ComplianceReview

### 同学 D - 测试 & 文档
- **职责：**
  - 功能测试
  - Bug 修复
  - 文档编写
  - 用户手册
- **负责模块：** KnowledgeBase、SystemSettings、PersonnelMatrix、README.md

---

## 🔄 开发流程

### 1. 需求分析阶段 (第1-2天)
- [ ] 集体讨论功能需求
- [ ] 确定 MVP 功能列表
- [ ] 划分开发优先级

### 2. 设计阶段 (第3-4天)
- [ ] 数据库设计
- [ ] API 接口设计
- [ ] 组件结构设计
- [ ] UI/UX 原型

### 3. 开发阶段 (第5-14天)
- [ ] 搭建基础架构
- [ ] 并行开发各模块
- [ ] 每日站会 (15分钟)
- [ ] 代码审查

### 4. 测试阶段 (第15-17天)
- [ ] 单元测试
- [ ] 集成测试
- [ ] Bug 修复
- [ ] 性能优化

### 5. 部署上线 (第18-20天)
- [ ] 部署准备
- [ ] 灰度发布
- [ ] 监控告警
- [ ] 文档完善

---

## 🌿 Git 工作流

### 分支策略 (Git Flow)

```
main (生产环境)
  ↑
develop (开发主分支)
  ↑
feature/* (功能分支)
bugfix/* (修复分支)
hotfix/* (紧急修复)
```

### 分支命名规范
```
feature/meeting-management      # 新功能
feature/ai-integration         # 新功能
bugfix/sidebar-styling         # Bug 修复
hotfix/crash-on-load          # 紧急修复
```

### 工作流程

#### 1. 创建功能分支
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

#### 2. 开发 & 提交
```bash
git add .
git commit -m "feat: add meeting creation dialog"
```

#### 3. 推送到远程
```bash
git push origin feature/your-feature-name
```

#### 4. 创建 Pull Request
- 在 GitHub/GitLab 创建 PR
- 填写 PR 模板
- @ 负责人进行代码审查
- 根据反馈修改代码
- 合并到 `develop`

#### 5. 定期合并到 main
- 每周或每个里程碑
- 从 `develop` 创建 `release` 分支
- 测试通过后合并到 `main`

### 提交信息规范 (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type):**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响逻辑）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例：**
```bash
feat(meeting): add meeting creation form
fix(recording): resolve scrollRef null error
docs(readme): update installation guide
```

---

## 📐 模块划分

### 核心模块 (每位同学 2-3 个)

| 模块 | 负责人 | 优先级 | 状态 |
|------|--------|--------|------|
| Dashboard (全局控制台) | A | P0 | ✅ 已完成 |
| MeetingManager (会议管理) | B | P0 | ✅ 已完成 |
| RecordingWorkspace (智能录音) | C | P0 | ✅ 已完成 |
| ComplianceReview (合规审查) | C | P0 | ✅ 已完成 |
| DocumentCenter (文书中心) | B | P1 | ✅ 已完成 |
| KnowledgeBase (法律文件库) | D | P1 | ✅ 已完成 |
| SystemSettings (系统设置) | D | P2 | ✅ 已完成 |
| PersonnelMatrix (人员矩阵) | D | P2 | ✅ 已完成 |
| Sidebar (侧边栏) | B | P0 | ✅ 已完成 |
| server.ts (后端服务) | C | P0 | ✅ 已完成 |

### 文件结构协作规则

```
src/
├── components/           # 公共组件（共同维护）
│   ├── Sidebar.tsx      # 负责人：B
│   ├── Dashboard.tsx    # 负责人：A
│   ├── MeetingManager.tsx # 负责人：B
│   ├── RecordingWorkspace.tsx # 负责人：C
│   ├── ComplianceReview.tsx # 负责人：C
│   ├── DocumentCenter.tsx # 负责人：B
│   ├── KnowledgeBase.tsx # 负责人：D
│   ├── SystemSettings.tsx # 负责人：D
│   ├── PersonnelMatrix.tsx # 负责人：D
│   └── StatCard.tsx     # 公共组件
├── lib/                 # 工具函数（共同维护）
│   └── utils.ts
├── types.ts             # 类型定义（负责人：A）
├── App.tsx              # 主应用（负责人：A）
└── main.tsx             # 入口文件（负责人：A）
```

---

## 🛠️ 环境配置

### 1. 本地开发环境初始化

每位同学首次克隆项目后执行：

```bash
# 克隆仓库
git clone <repository-url>
cd sanhuiapp

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 2. 环境变量配置

创建 `.env` 文件（本地开发用，不要提交）：

```env
# AI 服务配置
GEMINI_API_KEY=your_gemini_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 百度语音识别
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key

# 后端服务
NODE_ENV=development
PORT=3000
```

### 3. 代码编辑器配置

推荐使用 VS Code，安装以下插件：

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "pkief.material-icon-theme"
  ]
}
```

---

## 💬 沟通协作

### 1. 每日站会 (Daily Standup)
- **时间：** 每天早上 10:00
- **时长：** 15 分钟
- **内容：**
  - 昨天完成了什么
  - 今天计划做什么
  - 遇到了什么困难

### 2. 沟通工具
- **代码协作：** GitHub / GitLab
- **即时通讯：** 微信 / 钉钉 / Slack
- **文档协作：** Notion / 语雀 / 腾讯文档
- **项目管理：** Trello / Jira / GitHub Projects

### 3. 代码审查 (Code Review)
- **审查者：** 模块负责人或项目负责人
- **审查要点：**
  - 代码风格是否一致
  - 是否有潜在 Bug
  - 是否符合项目规范
  - 是否需要添加注释
- **响应时间：** 24 小时内

---

## ⚠️ 冲突解决

### 1. 代码冲突解决步骤

```bash
# 1. 拉取最新代码
git fetch origin
git rebase origin/develop

# 2. 如果有冲突，VS Code 会显示
# <<<<<<< HEAD
# 你的代码
# =======
# 别人的代码
# >>>>>>> origin/develop

# 3. 手动解决冲突后
git add .
git rebase --continue

# 4. 如果需要放弃本次 rebase
git rebase --abort
```

### 2. 避免冲突的最佳实践

- ✅ 频繁同步 develop 分支
- ✅ 小步提交，避免大量改动
- ✅ 明确模块边界，减少交叉修改
- ✅ 使用 Git 标签标记里程碑
- ❌ 避免直接修改 develop/main 分支
- ❌ 避免长时间不提交代码

---

## 📚 代码规范

### TypeScript 规范

```typescript
// ✅ 推荐
interface User {
  id: string;
  name: string;
}

const getUser = (id: string): User | null => {
  // ...
};

// ❌ 避免
const getUser = (id) => {
  // ...
};
```

### React 组件规范

```typescript
// ✅ 推荐
import React, { useState, useEffect } from "react";

interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export const MyComponent: React.FC<Props> = ({ title, onSubmit }) => {
  // ...
};

// ❌ 避免
export default function MyComponent(props) {
  // ...
}
```

### Tailwind CSS 规范

```html
<!-- ✅ 推荐 -->
<div className="flex items-center justify-between p-4 bg-mck-navy">
  <span className="text-sm font-bold">Title</span>
</div>

<!-- ❌ 避免 -->
<div class="flex items-center justify-between p-4 bg-mck-navy">
  <span class="text-sm font-bold">Title</span>
</div>
```

---

## 🎯 里程碑 (Milestones)

### Milestone 1: 核心功能 (Week 1)
- [x] 基础架构搭建
- [x] Dashboard 实现
- [x] 会议管理功能
- [x] 智能录音功能

### Milestone 2: 合规审查 (Week 2)
- [x] 合规审查功能
- [x] AI 模型集成
- [x] 文书中心
- [x] 法律文件库

### Milestone 3: 完善功能 (Week 3)
- [x] 系统设置
- [x] 人员矩阵
- [x] UI/UX 优化
- [ ] 单元测试

### Milestone 4: 上线部署 (Week 4)
- [ ] 性能优化
- [ ] 安全加固
- [ ] 部署上线
- [ ] 用户手册

---

## 🚀 快速开始协作

### Step 1: 初始化项目

```bash
# 创建 GitHub 仓库
git init
git add .
git commit -m "chore: initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main

# 创建并推送 develop 分支
git checkout -b develop
git push -u origin develop
```

### Step 2: 邀请团队成员

1. 进入 GitHub 仓库 Settings → Collaborators
2. 添加 4 位同学的 GitHub 账号
3. 设置权限：Read/Write

### Step 3: 创建 Issue 模板

在 `.github/ISSUE_TEMPLATE/` 下创建模板文件

### Step 4: 创建 Pull Request 模板

在 `.github/PULL_REQUEST_TEMPLATE.md` 下创建模板

---

## 📞 联系方式

| 角色 | 姓名 | 微信 | 邮箱 |
|------|------|------|------|
| 负责人 | - | - | - |
| 前端开发 | - | - | - |
| 后端开发 | - | - | - |
| 测试文档 | - | - | - |

---

## 🎓 学习资源

- [Git 官方文档](https://git-scm.com/doc)
- [React 官方文档](https://react.dev)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Git Flow 工作流](https://nvie.com/posts/a-successful-git-branching-model/)

---

**最后更新：** 2026-03-31
**文档维护者：** 项目负责人
