# auto-push.ps1 - 自动推送代码
param(
    [string]$Message = "chore: auto update",
    [string]$Branch = "main"
)

Write-Host "正在推送代码..." -ForegroundColor Green

# 检查是否有更改
$status = git status --porcelain
if (-not $status) {
    Write-Host "⚠️  没有需要提交的更改" -ForegroundColor Yellow
    exit 0
}

# 添加所有更改
Write-Host "正在添加更改..." -ForegroundColor Cyan
git add .

# 提交
Write-Host "正在提交更改..." -ForegroundColor Cyan
git commit -m $Message

# 推送
Write-Host "正在推送到远程..." -ForegroundColor Cyan
git push origin $Branch

Write-Host "✅ 代码已推送到 GitHub" -ForegroundColor Green
