# 协作开发快速启动指南

> 本文档为团队成员提供快速上手的步骤指引，详细的协作规范请查看 [TEAM_COLLABORATION.md](./TEAM_COLLABORATION.md)

---

## 🚀 第一次参与项目

### Step 1: 环境准备 (5 分钟)

1. **安装必要的工具**
   ```bash
   # 检查 Node.js 版本（需要 v18+）
   node --version

   # 检查 npm 版本
   npm --version

   # 检查 Git 版本
   git --version
   ```

2. **安装 VS Code 推荐插件**
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense
   - ES7+ React/Redux/React-Native snippets
   - Material Icon Theme

### Step 2: 克隆项目 (2 分钟)

```bash
# 克隆仓库
git clone <your-repository-url>
cd sanhuiapp

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 API Key
# Windows
notepad .env

# macOS/Linux
vim .env  # 或使用其他编辑器
```

### Step 3: 启动开发服务器 (1 分钟)

```bash
npm run dev
```

访问 http://localhost:3000 查看应用

### Step 4: 创建开发分支 (1 分钟)

```bash
# 从 develop 分支创建新分支
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 示例：
git checkout -b feature/meeting-creation-form
```

---

## 📝 日常开发流程

### 1. 开始工作
```bash
# 切换到 develop 分支并拉取最新代码
git checkout develop
git pull origin develop

# 创建新的功能分支
git checkout -b feature/your-feature
```

### 2. 编写代码
- 在你的分支上进行开发
- 遵循项目代码规范（见 TEAM_COLLABORATION.md）
- 及时提交代码

### 3. 提交代码
```bash
# 查看修改状态
git status

# 添加所有修改
git add .

# 提交（使用规范的提交信息）
git commit -m "feat: add meeting creation dialog"
# 或
git commit -m "fix: resolve scrollRef null error"
```

### 4. 推送到远程
```bash
git push origin feature/your-feature
```

### 5. 创建 Pull Request
1. 访问 GitHub 仓库
2. 点击 "Compare & pull request"
3. 填写 PR 模板
4. @ 负责人进行代码审查
5. 根据反馈修改代码
6. 等待合并

### 6. 合并后清理
```bash
# 切换回 develop 分支
git checkout develop

# 拉取最新代码
git pull origin develop

# 删除已合并的分支
git branch -d feature/your-feature
```

---

## ⚡ 常用命令速查

### Git 命令
```bash
# 查看分支
git branch -a

# 创建分支
git checkout -b feature/name

# 切换分支
git checkout branch-name

# 合并分支
git merge feature-name

# 查看提交历史
git log --oneline --graph

# 撤销最近一次提交
git reset --soft HEAD~1

# 查看远程仓库
git remote -v

# 更新远程分支列表
git fetch --all
```

### 开发命令
```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run lint

# 构建生产版本
npm run build

# 清理构建文件
npm run clean

# 预览生产构建
npm run preview
```

---

## 🎯 提交信息模板

### 新功能
```bash
feat(module): description

示例：
feat(meeting): add meeting creation form
feat(recording): integrate Baidu ASR API
```

### Bug 修复
```bash
fix(module): description

示例：
fix(recording): resolve scrollRef null error
fix(dashboard): correct compliance score calculation
```

### 文档更新
```bash
docs(module): description

示例：
docs(readme): update installation guide
docs(api): add API endpoint documentation
```

### 其他类型
```bash
style(module): description    # 代码格式
refactor(module): description # 重构
test(module): description     # 测试
chore(module): description    # 构建/工具
```

---

## ⚠️ 常见问题

### Q1: 代码冲突怎么解决？
```bash
# 1. 拉取最新代码
git fetch origin
git rebase origin/develop

# 2. 手动解决冲突（VS Code 会标记）

# 3. 标记为已解决
git add .

# 4. 继续 rebase
git rebase --continue

# 5. 强制推送
git push origin feature/your-feature --force-with-lease
```

### Q2: 如何回滚代码？
```bash
# 回滚到指定提交
git log  # 查看提交历史
git reset --hard <commit-hash>

# 回滚到上一个提交（保留修改）
git reset --soft HEAD~1

# 回滚到上一个提交（丢弃修改）
git reset --hard HEAD~1
```

### Q3: 如何撤销已推送的提交？
```bash
# 创建一个撤销提交的新提交
git revert <commit-hash>

# 或者使用 force push（谨慎使用）
git push origin feature/your-feature --force
```

### Q4: 端口被占用怎么办？
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9

# 或者在 .env 中修改 PORT=3001
```

### Q5: 依赖安装失败？
```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

---

## 📞 获取帮助

### 文档资源
- [详细协作指南](./TEAM_COLLABORATION.md)
- [项目看板](./PROJECT_BOARD.md)
- [项目 README](./README.md)

### 团队联系
- **项目负责人：** 同学 A
- **前端问题：** 同学 B
- **后端/AI 问题：** 同学 C
- **测试/文档问题：** 同学 D

### 报告问题
- [创建 Bug Report](../../issues/new?template=bug_report.yml)
- [创建 Feature Request](../../issues/new?template=feature_request.yml)

---

## ✅ 检查清单

在提交代码前，请确保：

- [ ] 代码已通过本地测试
- [ ] 没有引入新的 console.log / debugger
- [ ] 代码风格与项目保持一致
- [ ] 提交信息遵循 Conventional Commits 规范
- [ ] 已查看相关模块的实现，避免重复开发
- [ ] 如有必要的文档更新，已同步更新

---

**祝开发顺利！💪**
