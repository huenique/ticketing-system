# Get the directory of this script
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Load NVM and set Node version
$env:NVM_HOME = "$env:USERPROFILE\nvm"
$env:NVM_SYMLINK = "$env:ProgramFiles\nodejs"
$env:PATH = "$env:NVM_SYMLINK;$env:NVM_HOME;$env:USERPROFILE\AppData\Roaming\npm;$env:PATH"

nvm use 22.16.0 | Out-Null

# Define project/app paths relative to script location
$projectDir = $scriptRoot
$appDir = Join-Path $projectDir "ticketing-app"

# Ensure we’re in the repo
Set-Location $projectDir

# Git fetch and compare
git fetch origin main
$local = git rev-parse HEAD
$remote = git rev-parse origin/main

if ($local -ne $remote) {
    Write-Output "$(Get-Date) - Changes detected. Pulling latest from origin/main…"

    git pull origin main

    # Install and build
    Set-Location $appDir
    pnpm install
    pnpm exec vite build

    # Kill anything on port 5173
    $pid = Get-NetTCPConnection -LocalPort 5173 -State Listen | ForEach-Object { $_.OwningProcess } | Select-Object -First 1
    if ($pid) {
        Write-Output "$(Get-Date) - Killing process on port 5173 (PID $pid)"
        Stop-Process -Id $pid -Force
    }

    # Restart or start with PM2
    Write-Output "$(Get-Date) - Restarting Vite dev server with PM2…"
    if (-not (pm2 restart ticketing 2>$null)) {
        pm2 start "pnpm" --name "ticketing" -- run vite -- --host --port 5173
    }
} else {
    Write-Output "$(Get-Date) - No changes."
}
