#!/usr/bin/env bash
# Camera 3A · macOS 增量更新脚本
# 用法（在解压后的新版本目录里）：bash deploy/self-host/update-mac.sh

set -e

INSTALL_DIR="$HOME/Library/Application Support/Camera3A"
PLIST_FILE="$HOME/Library/LaunchAgents/com.camera3a.server.plist"

if [ ! -d "$INSTALL_DIR" ]; then
  echo "❌ 没找到 $INSTALL_DIR，是不是还没跑过 install-mac.sh？"
  exit 1
fi

SRC_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
echo "✓ 新版本源：$SRC_DIR"
echo "✓ 安装目录：$INSTALL_DIR"

echo "→ 增量同步代码文件 ..."
rsync -a \
  --exclude='.git/' \
  --exclude='deploy/' \
  --exclude='docs/' \
  --exclude='tests/' \
  --exclude='node_modules/' \
  --exclude='.claude/' \
  --exclude='*.pyc' \
  --exclude='__pycache__/' \
  --exclude='dist/' \
  "$SRC_DIR/" "$INSTALL_DIR/"

echo "→ 重启服务 ..."
launchctl unload "$PLIST_FILE" 2>/dev/null || true
launchctl load "$PLIST_FILE"
sleep 2

if launchctl list | grep -q "com.camera3a.server"; then
  echo ""
  echo "==========================================="
  echo "✅ 更新成功"
  echo "==========================================="
  echo ""
  echo "查看版本：cat \"$INSTALL_DIR/.version\" 2>/dev/null || echo '没有版本标记'"
else
  echo "❌ 启动失败。看日志：tail -f ~/Library/Logs/camera3a.log"
  exit 1
fi
