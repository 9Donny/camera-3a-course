#!/usr/bin/env bash
# Camera 3A · Linux 增量更新脚本
# 用法（在解压后的新版本目录里）：sudo bash deploy/self-host/update-linux.sh
# 不会动用户的同步配置 / 学习数据（这些都在浏览器 localStorage，不在主机）
# 只更新代码文件 + 重启服务

set -e

INSTALL_DIR="/opt/camera3a"
SERVICE_NAME="camera3a"

if [ "$EUID" -ne 0 ]; then
  echo "❌ 请用 sudo 运行：sudo bash update-linux.sh"
  exit 1
fi

if [ ! -d "$INSTALL_DIR" ]; then
  echo "❌ 没找到已安装目录 $INSTALL_DIR，是不是还没跑过 install-linux.sh？"
  exit 1
fi

# 当前脚本目录就是新版本源
SRC_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
echo "✓ 新版本源：$SRC_DIR"
echo "✓ 安装目录：$INSTALL_DIR"

echo "→ 增量同步代码文件 ..."
# rsync -a 不带 --delete：保留 install dir 下的非项目文件（避免误删）
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
systemctl restart "$SERVICE_NAME"
sleep 2

if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo ""
  echo "==========================================="
  echo "✅ 更新成功"
  echo "==========================================="
  echo ""
  echo "查看版本：cat $INSTALL_DIR/.version 2>/dev/null || echo '没有版本标记'"
  echo "查看状态：systemctl status $SERVICE_NAME"
else
  echo "❌ 服务启动失败。看日志：journalctl -u $SERVICE_NAME -n 50"
  exit 1
fi
