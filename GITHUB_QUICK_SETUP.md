# GitHub 自动同步快速配置（5 分钟完成）

## 🚀 最快配置方法（推荐）

### 步骤 1：创建 GitHub Personal Access Token（2 分钟）

1. 访问：https://github.com/settings/tokens
2. 点击 **Generate new token (classic)**
3. 填写：
   - **Note**: `Auto Sync`
   - **Expiration**: `90 days`
   - **Select scopes**: ✅ `repo`（打勾）
4. 点击 **Generate token**
5. **⚠️ 复制生成的 token**（只显示一次！）

### 步骤 2：配置 Git 凭据（1 分钟）

```powershell
# 在 PowerShell 中执行
git config --global credential.helper manager
```

### 步骤 3：首次推送（1 分钟）

```powershell
cd d:/vibecoding/sanhuiapp

# 首次推送会要求输入用户名和密码
# 用户名：你的 GitHub 用户名
# 密码：刚才复制的 Personal Access Token

git add .
git commit -m "chore: initial sync setup"
git push origin main
```

### 步骤 4：使用自动化脚本（1 分钟）

现在你可以使用这些命令快速同步：

```powershell
# 拉取最新代码
./scripts/auto-pull.ps1

# 推送代码
./scripts/auto-push.ps1

# 完整同步（拉取+提交+推送）
./scripts/auto-sync.ps1
```

---

## ⌨️ VS Code 快捷键

在 VS Code 中按以下快捷键：

- `Ctrl + Shift + L` - 拉取最新代码
- `Ctrl + Shift + U` - 推送代码
- `Ctrl + Shift + G` - 完整同步

---

## 🎯 推荐工作流

### 开始工作前
```powershell
# 1. 拉取最新代码
./scripts/auto-pull.ps1

# 2. 创建功能分支
git checkout -b feature/your-feature
```

### 开发过程中
```powershell
# 提交并推送
./scripts/auto-push.ps1
```

### 完成后
```powershell
# 创建 PR
# 在 GitHub 上创建 Pull Request
```

---

## ❓ 常见问题

### Q: 推送时提示权限被拒绝？
**A:** 重新生成 Personal Access Token，旧 token 可能已过期。

### Q: 忘记保存 token 了？
**A:** 重新生成一个，GitHub 不允许查看已生成的 token。

### Q: 想要更安全的方式？
**A:** 使用 SSH Key 代替 Personal Access Token。详见 [完整配置指南](./docs/GITHUB_AUTO_SETUP.md)。

---

## 📖 详细文档

需要更多配置选项？查看完整文档：
- [GitHub 自动化配置指南](./docs/GITHUB_AUTO_SETUP.md)
- [团队协作指南](./docs/TEAM_COLLABORATION.md)

---

**配置完成时间：** 约 5 分钟
**维护者：** 团队负责人
