#!/usr/bin/env bash
# Camera 3A 卸载脚本（Linux）
# 用法：sudo bash uninstall-linux.sh

set -e

if [ "$EUID" -ne 0 ]; then
  echo "❌ 请用 sudo 运行"
  exit 1
fi

SERVICE_NAME="camera3a"
INSTALL_DIR="/opt/camera3a"

echo "→ 停止并禁用服务 ..."
systemctl stop $SERVICE_NAME 2>/dev/null || true
systemctl disable $SERVICE_NAME 2>/dev/null || true

echo "→ 删除 systemd unit ..."
rm -f /etc/systemd/system/${SERVICE_NAME}.service
systemctl daemon-reload

echo "→ 删除安装目录 $INSTALL_DIR ..."
rm -rf "$INSTALL_DIR"

echo "→ 删除日志 /var/log/camera3a.log ..."
rm -f /var/log/camera3a.log

echo "✅ 卸载完成"
