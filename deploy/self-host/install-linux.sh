#!/usr/bin/env bash
# Camera 3A 课程 · Linux 一键安装脚本
# 用法（在解压后的目录里）：sudo bash install-linux.sh [PORT]
# 默认端口 8080，可在末尾传一个数字改端口
#
# 做的事：
#   1. 把项目文件复制到 /opt/camera3a/
#   2. 创建 systemd unit 文件，配置开机自启 + 后台运行
#   3. 启动服务并显示访问地址
#
# 卸载：sudo bash uninstall-linux.sh

set -e

PORT="${1:-8080}"
INSTALL_DIR="/opt/camera3a"
SERVICE_NAME="camera3a"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# 必须 root
if [ "$EUID" -ne 0 ]; then
  echo "❌ 请用 sudo 运行：sudo bash install-linux.sh"
  exit 1
fi

# 检查 python3
if ! command -v python3 &> /dev/null; then
  echo "❌ 没找到 python3。请先安装："
  echo "   Ubuntu/Debian:  apt install python3"
  echo "   CentOS/RHEL:    yum install python3"
  exit 1
fi

PYBIN="$(command -v python3)"
echo "✓ 找到 Python：$PYBIN"

# 当前脚本目录就是部署源
SRC_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
echo "✓ 源目录：$SRC_DIR"

# 创建安装目录并复制文件
echo "→ 复制文件到 $INSTALL_DIR/ ..."
mkdir -p "$INSTALL_DIR"
# 排除 deploy/ docs/ tests/ .git 等无关目录
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

# 写 systemd unit 文件
echo "→ 创建 systemd 服务 $SERVICE_FILE ..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Camera 3A Course Server
After=network.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
ExecStart=${PYBIN} ${INSTALL_DIR}/server.py ${PORT}
Restart=on-failure
RestartSec=3
StandardOutput=append:/var/log/camera3a.log
StandardError=append:/var/log/camera3a.log

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
echo "→ 启动服务 ..."
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

# 等 2 秒看是否起得来
sleep 2
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo ""
  echo "==========================================="
  echo "✅ 安装成功！"
  echo "==========================================="
  echo ""
  echo "访问地址："
  IPS=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^$' | head -3)
  for ip in $IPS; do
    echo "  → http://$ip:$PORT/"
  done
  echo "  → http://localhost:$PORT/  (本机)"
  echo ""
  echo "状态查看：systemctl status $SERVICE_NAME"
  echo "日志查看：tail -f /var/log/camera3a.log"
  echo "停止服务：systemctl stop $SERVICE_NAME"
  echo "重启服务：systemctl restart $SERVICE_NAME"
  echo ""
  echo "防火墙提醒：如果用云服务器，记得在安全组放行端口 $PORT"
else
  echo "❌ 服务启动失败。看日志：journalctl -u $SERVICE_NAME -n 50"
  exit 1
fi
