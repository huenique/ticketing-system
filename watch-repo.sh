#!/bin/bash

# Load NVM and set Node version
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22.16.0

# Define paths
PM2="$(which pm2)"
PNPM="$(which pnpm)"
PROJECT_DIR="/root/ticketing-system"
APP_DIR="$PROJECT_DIR/ticketing-app"

# Go to the repo root to fetch & compare
cd "$PROJECT_DIR" || exit 1
/usr/bin/git fetch origin main
LOCAL=$(/usr/bin/git rev-parse HEAD)
REMOTE=$(/usr/bin/git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "$(date) - Changes detected. Pulling latest from origin/main…"

    # Pull changes in the repo root
    /usr/bin/git pull origin main

    # Enter the Vite app directory for install & build
    cd "$APP_DIR" || exit 1
    $PNPM install
    $PNPM exec vite build

    # Ensure port 5173 is free
    PID=$(lsof -t -i:5173)
    if [ -n "$PID" ]; then
        echo "$(date) - Killing process on port 5173 (PID $PID)"
        kill -9 $PID
    fi

    # Restart (or start) the dev server under PM2
    echo "$(date) - Restarting Vite dev server with PM2…"
    $PM2 restart ticketing \
        || $PM2 start $PNPM --name ticketing -- exec vite --host --port 5173
else
    echo "$(date) - No changes."
fi
