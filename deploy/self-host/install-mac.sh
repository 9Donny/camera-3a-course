#!/usr/bin/env bash
# Camera 3A 课程 · macOS 安装脚本
# 用法：bash install-mac.sh [PORT]
# 不需要 sudo（用 LaunchAgent，per-user 模式）

set -e

PORT="${1:-8080}"
INSTALL_DIR="$HOME/Library/Application Support/Camera3A"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$PLIST_DIR/com.camera3a.server.plist"
LOG_FILE="$HOME/Library/Logs/camera3a.log"

# 检查 python3
if ! command -v python3 &> /dev/null; then
  echo "❌ 没找到 python3。请先安装："
  echo "   brew install python3"
  echo "   或从 https://www.python.org/downloads/ 下载安装"
  exit 1
fi

PYBIN="$(command -v python3)"
echo "✓ 找到 Python：$PYBIN"

# 源目录
SRC_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
echo "✓ 源目录：$SRC_DIR"

# 创建安装目录并复制
echo "→ 复制文件到 $INSTALL_DIR/ ..."
mkdir -p "$INSTALL_DIR"
rsync -a --delete \
  --exclude='.git/' \
  --exclude='deploy/' \
  --exclude='docs/' \
  --exclude='tests/' \
  --exclude='node_modules/' \
  --exclude='.claude/' \
  --exclude='*.pyc' \
  --exclude='__pycache__/' \
  "$SRC_DIR/" "$INSTALL_DIR/"

# 写 LaunchAgent
mkdir -p "$PLIST_DIR"
cat > "$PLIST_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.camera3a.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>${PYBIN}</string>
    <string>${INSTALL_DIR}/server.py</string>
    <string>${PORT}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${INSTALL_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_FILE}</string>
  <key>StandardErrorPath</key>
  <string>${LOG_FILE}</string>
</dict>
</plist>
EOF

echo "→ 加载 LaunchAgent ..."
# 先卸载老的（如果存在）
launchctl unload "$PLIST_FILE" 2>/dev/null || true
launchctl load "$PLIST_FILE"

sleep 2

# 检查是否启动成功
if launchctl list | grep -q "com.camera3a.server"; then
  echo ""
  echo "==========================================="
  echo "✅ 安装成功！"
  echo "==========================================="
  echo ""
  echo "访问地址："
  IPS=$(ifconfig | awk '/inet /{print $2}' | grep -v '127.0.0.1' | head -3)
  for ip in $IPS; do
    echo "  → http://$ip:$PORT/"
  done
  echo "  → http://localhost:$PORT/  (本机)"
  echo ""
  echo "日志查看：tail -f $LOG_FILE"
  echo "停止服务：launchctl unload $PLIST_FILE"
  echo "重新启动：launchctl unload $PLIST_FILE && launchctl load $PLIST_FILE"
  echo ""
  echo "Mac 重启会自动恢复服务。"
else
  echo "❌ 启动失败，看日志：tail -f $LOG_FILE"
  exit 1
fi
