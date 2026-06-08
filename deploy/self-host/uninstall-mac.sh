#!/usr/bin/env bash
# Camera 3A macOS 卸载脚本

PLIST_FILE="$HOME/Library/LaunchAgents/com.camera3a.server.plist"
INSTALL_DIR="$HOME/Library/Application Support/Camera3A"
LOG_FILE="$HOME/Library/Logs/camera3a.log"

echo "→ 卸载 LaunchAgent ..."
launchctl unload "$PLIST_FILE" 2>/dev/null || true
rm -f "$PLIST_FILE"

echo "→ 删除安装目录 $INSTALL_DIR ..."
rm -rf "$INSTALL_DIR"

echo "→ 删除日志 ..."
rm -f "$LOG_FILE"

echo "✅ 卸载完成"
