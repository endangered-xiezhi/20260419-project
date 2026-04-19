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
$local = git rev-parse HEAD
$remote = git rev-parse origin/$Branch

if ($local -ne $remote) {
    Write-Host "检测到远程有更新，正在拉取..." -ForegroundColor Yellow
    git pull origin $Branch
    Write-Host "✅ 代码已更新到最新版本" -ForegroundColor Green
} else {
    Write-Host "✅ 本地已是最新版本" -ForegroundColor Green
}
