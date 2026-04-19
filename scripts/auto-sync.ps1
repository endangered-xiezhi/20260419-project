# auto-sync.ps1 - 完整的自动同步脚本
param(
    [string]$Message = "chore: auto sync",
    [string]$Branch = "main"
)

Write-Host "=== 开始同步代码 ===" -ForegroundColor Cyan

# 1. 拉取最新代码
Write-Host "`n步骤 1: 检查远程更新..." -ForegroundColor Yellow
git fetch origin
$local = git rev-parse HEAD
$remote = git rev-parse origin/$Branch

if ($local -ne $remote) {
    Write-Host "检测到远程有更新，正在合并..." -ForegroundColor Yellow
    git pull origin $Branch --rebase
    Write-Host "✅ 远程更新已合并" -ForegroundColor Green
} else {
    Write-Host "本地已是最新" -ForegroundColor Green
}

# 2. 提交本地更改
$status = git status --porcelain
if ($status) {
    Write-Host "`n步骤 2: 提交本地更改..." -ForegroundColor Yellow
    git add .
    git commit -m $Message
    Write-Host "✅ 已提交更改" -ForegroundColor Green

    # 3. 推送到远程
    Write-Host "`n步骤 3: 推送到远程..." -ForegroundColor Yellow
    git push origin $Branch
    Write-Host "✅ 已推送到远程" -ForegroundColor Green
} else {
    Write-Host "`n没有需要提交的更改" -ForegroundColor Green
}

Write-Host "`n=== 同步完成 ===" -ForegroundColor Green
