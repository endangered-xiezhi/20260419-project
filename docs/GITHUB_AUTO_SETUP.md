# GitHub 自动 Push/Pull 配置指南

## 📋 目录

- [IDE 自动同步配置](#ide-自动同步配置)
- [GitHub 令牌配置](#github-令牌配置)
- [自动化脚本配置](#自动化脚本配置)
- [VS Code 集成](#vs-code-集成)
- [常见问题](#常见问题)

---

## IDE 自动同步配置

### 方法一：使用 GitHub Personal Access Token（推荐）

#### 1. 创建 GitHub Personal Access Token

1. 登录 GitHub
2. 点击右上角头像 → **Settings**
3. 左侧菜单 → **Developer settings**
4. **Personal access tokens** → **Tokens (classic)**
5. 点击 **Generate new token (classic)**
6. 填写配置：
   - **Note**: `CodeBuddy Auto Sync`
   - **Expiration**: 选择过期时间（建议 90 天）
   - **Select scopes**: 勾选以下权限：
     - ✅ `repo` (完整仓库权限)
     - ✅ `workflow` (工作流权限，可选)
7. 点击 **Generate token**
8. **⚠️ 重要**：复制生成的 token（只显示一次）

#### 2. 配置 Git 凭据

```powershell
# 方法 1：使用 Git Credential Manager（推荐）
git config --global credential.helper manager

# 方法 2：使用 token 直接推送（临时方案）
git remote set-url origin https://<YOUR_TOKEN>@github.com/xiaopidu/sanhuiapp.git
```

#### 3. 验证配置

```powershell
# 测试推送
git remote -v
git push -u origin main
```

---

### 方法二：使用 SSH Key（更安全）

#### 1. 生成 SSH Key

```powershell
# 生成 SSH Key（如果还没有）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 或者使用 RSA（兼容性更好）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

#### 2. 添加 SSH Key 到 GitHub

1. 复制公钥：
```powershell
cat ~/.ssh/id_ed25519.pub
# 或
cat ~/.ssh/id_rsa.pub
```

2. 添加到 GitHub：
   - GitHub → **Settings** → **SSH and GPG keys**
   - 点击 **New SSH key**
   - 粘贴公钥内容
   - 点击 **Add SSH key**

#### 3. 切换远程仓库为 SSH

```powershell
git remote set-url origin git@github.com:xiaopidu/sanhuiapp.git
```

#### 4. 测试连接

```powershell
ssh -T git@github.com
```

---

## 自动化脚本配置

### 自动 Pull 脚本

创建 `scripts/auto-pull.ps1`：

```powershell
# auto-pull.ps1 - 自动拉取最新代码
param(
    [string]$Branch = "main"
)

Write-Host "正在拉取最新代码..." -ForegroundColor Green

# 检查是否有未提交的更改
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  检测到未提交的更改，请先提交或暂存：" -ForegroundColor Yellow
    Write-Host $status -ForegroundColor Yellow
    exit 1
}

# 拉取最新代码
git fetch origin
git pull origin $Branch

Write-Host "✅ 代码已更新到最新版本" -ForegroundColor Green
```

### 自动 Push 脚本

创建 `scripts/auto-push.ps1`：

```powershell
# auto-push.ps1 - 自动推送代码
param(
    [string]$Message = "chore: auto update",
    [string]$Branch = "main"
)

Write-Host "正在推送代码..." -ForegroundColor Green

# 添加所有更改
git add .

# 提交
git commit -m $Message

# 推送
git push origin $Branch

Write-Host "✅ 代码已推送到 GitHub" -ForegroundColor Green
```

### 完整同步脚本

创建 `scripts/auto-sync.ps1`：

```powershell
# auto-sync.ps1 - 完整的自动同步脚本
param(
    [string]$Message = "chore: auto sync",
    [string]$Branch = "main"
)

Write-Host "=== 开始同步代码 ===" -ForegroundColor Cyan

# 1. 拉取最新代码
Write-Host "步骤 1: 拉取最新代码..." -ForegroundColor Yellow
git fetch origin
$local = git rev-parse HEAD
$remote = git rev-parse origin/$Branch

if ($local -ne $remote) {
    Write-Host "检测到远程有更新，正在合并..." -ForegroundColor Yellow
    git pull origin $Branch --rebase
} else {
    Write-Host "本地已是最新" -ForegroundColor Green
}

# 2. 提交本地更改
$status = git status --porcelain
if ($status) {
    Write-Host "步骤 2: 提交本地更改..." -ForegroundColor Yellow
    git add .
    git commit -m $Message
    Write-Host "✅ 已提交更改" -ForegroundColor Green
} else {
    Write-Host "没有需要提交的更改" -ForegroundColor Green
    exit 0
}

# 3. 推送到远程
Write-Host "步骤 3: 推送到远程..." -ForegroundColor Yellow
git push origin $Branch

Write-Host "=== 同步完成 ===" -ForegroundColor Green
```

---

## VS Code 集成

### 配置 VS Code 自动推送

#### 1. 安装扩展

推荐安装以下 VS Code 扩展：

- **GitLens** - 增强 Git 功能
- **Git History** - 查看提交历史
- **GitHub Pull Requests** - 管理 PR

#### 2. 配置 VS Code 设置

在 `.vscode/settings.json` 中添加：

```json
{
  "git.enableSmartCommit": true,
  "git.confirmSync": false,
  "git.autofetch": true,
  "git.postCommitCommand": "none",
  "git.showInlineOpenFileAction": false,
  "git.enableCommitSigning": false,
  "githubPullRequests.pullBranch": "develop"
}
```

#### 3. 配置 VS Code Tasks

在 `.vscode/tasks.json` 中添加：

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Git: Pull",
      "type": "shell",
      "command": "git",
      "args": ["pull", "origin", "main"],
      "problemMatcher": []
    },
    {
      "label": "Git: Push",
      "type": "shell",
      "command": "git",
      "args": ["push", "origin", "main"],
      "problemMatcher": []
    },
    {
      "label": "Git: Sync",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-File",
        "${workspaceFolder}/scripts/auto-sync.ps1"
      ],
      "problemMatcher": []
    }
  ]
}
```

#### 4. 使用快捷键

在 `.vscode/keybindings.json` 中添加：

```json
[
  {
    "key": "ctrl+shift+p",
    "command": "git.sync",
    "when": "!inDebugMode"
  },
  {
    "key": "ctrl+shift+u",
    "command": "git.push",
    "when": "!inDebugMode"
  },
  {
    "key": "ctrl+shift+l",
    "command": "git.pull",
    "when": "!inDebugMode"
  }
]
```

---

## 自动化工作流

### 方案一：使用 Git Hooks（高级）

#### 安装 Git Hooks 管理工具

```bash
npm install -g husky
cd d:/vibecoding/sanhuiapp
husky init
```

#### 配置 pre-commit Hook

创建 `.husky/pre-commit`：

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "运行代码检查..."
npm run lint

echo "运行测试..."
npm test
```

#### 配置 post-merge Hook

创建 `.husky/post-merge`：

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "代码已更新，正在安装依赖..."
npm install
```

---

### 方案二：使用 GitHub Actions（持续集成）

创建 `.github/workflows/auto-sync.yml`：

```yaml
name: Auto Sync

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  sync:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Run tests
        run: |
          npm ci
          npm test
          
      - name: Lint code
        run: npm run lint
```

---

## 实用命令速查

### 日常操作

```powershell
# 查看状态
git status

# 添加所有更改
git add .

# 提交
git commit -m "your message"

# 推送
git push origin main

# 拉取
git pull origin main

# 同步（拉取+推送）
git sync
```

### 分支管理

```powershell
# 创建分支
git checkout -b feature/your-feature

# 切换分支
git checkout main

# 合并分支
git merge feature/your-feature

# 删除分支
git branch -d feature/your-feature
```

### 历史查看

```powershell
# 查看提交历史
git log --oneline

# 查看图形化历史
git log --graph --oneline --all

# 查看文件变更
git diff
```

---

## 常见问题

### Q1: 推送时提示权限被拒绝

**错误信息：**
```
fatal: remote: Permission denied to xiaopidu/sanhuiapp
```

**解决方案：**
1. 检查 GitHub 令牌是否过期
2. 重新生成 Personal Access Token
3. 确认仓库权限（owner/collaborator）

### Q2: 拉取时提示冲突

**错误信息：**
```
CONFLICT (content): Merge conflict in file.ts
```

**解决方案：**
```powershell
# 1. 保留本地更改
git pull --rebase origin main

# 2. 手动解决冲突后
git add .
git rebase --continue
```

### Q3: 提交消息格式错误

**错误信息：**
```
commit message does not match pattern
```

**解决方案：**
使用规范的提交消息格式：
```bash
feat: add new feature
fix: resolve bug
docs: update documentation
```

### Q4: 大文件推送失败

**错误信息：**
```
remote: error: File is larger than 100MB
```

**解决方案：**
```bash
# 安装 Git LFS
git lfs install

# 追踪大文件
git lfs track "*.zip"
git lfs track "*.pdf"

# 提交
git add .gitattributes
git commit -m "chore: enable git lfs"
```

---

## 推荐工作流程

### 每日开发流程

```powershell
# 1. 开始工作前
cd d:/vibecoding/sanhuiapp
git pull origin main

# 2. 创建功能分支
git checkout -b feature/your-feature

# 3. 开发和提交
git add .
git commit -m "feat: add new functionality"

# 4. 推送到远程
git push -u origin feature/your-feature

# 5. 创建 Pull Request
# 在 GitHub 上创建 PR

# 6. 审查和合并
# 等待审查 → 合并到 main

# 7. 清理本地分支
git checkout main
git pull origin main
git branch -d feature/your-feature
```

### 紧急修复流程

```powershell
# 1. 切换到主分支
git checkout main
git pull origin main

# 2. 创建修复分支
git checkout -b hotfix/urgent-fix

# 3. 修复并提交
git add .
git commit -m "fix: urgent bug fix"

# 4. 推送并合并
git push -u origin hotfix/urgent-fix

# 5. 创建紧急 PR
# 在 GitHub 上快速审查并合并
```

---

## 安全最佳实践

1. **永远不要提交敏感信息**
   - API Keys
   - 密码
   - 个人信息

2. **使用 `.gitignore`**
   ```gitignore
   .env
   .env.local
   node_modules/
   *.log
   ```

3. **定期更新 Access Token**
   - 每 90 天更新一次
   - 使用最小权限原则

4. **启用分支保护**
   - 设置 main 分支为受保护
   - 要求 PR 审查
   - 要求 CI 通过

---

## 资源链接

- [GitHub 官方文档](https://docs.github.com/)
- [Git 官方文档](https://git-scm.com/docs)
- [VS Code Git 扩展](https://code.visualstudio.com/docs/sourcecontrol/overview)
- [团队协作指南](./TEAM_COLLABORATION.md)

---

**最后更新：** 2026-03-31
**维护者：** 团队负责人
