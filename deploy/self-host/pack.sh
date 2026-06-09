#!/usr/bin/env bash
# 在 Mac 上打包：把课程项目 + 部署脚本 打成一个 tarball
# 用法：bash deploy/self-host/pack.sh
# 输出：dist/camera3a-course-<日期>.tar.gz + camera3a-course-<日期>.zip

set -e

cd "$(dirname "$0")/../.."
ROOT_DIR="$(pwd)"

STAMP="$(date +%Y%m%d-%H%M%S)"
PACKAGE_NAME="camera3a-course-${STAMP}"
DIST_DIR="$ROOT_DIR/dist"
STAGE_DIR="$DIST_DIR/$PACKAGE_NAME"

# 先写版本号到仓库根（让开发环境也能看到，前端 fetch /.version 用）
echo "$STAMP" > "$ROOT_DIR/.version"

echo "→ 清理 dist/ ..."
rm -rf "$DIST_DIR"
mkdir -p "$STAGE_DIR"

echo "→ 复制项目文件到 $STAGE_DIR ..."
rsync -a \
  --exclude='.git/' \
  --exclude='dist/' \
  --exclude='docs/' \
  --exclude='tests/' \
  --exclude='node_modules/' \
  --exclude='.claude/' \
  --exclude='*.pyc' \
  --exclude='__pycache__/' \
  --exclude='deploy/cloudflare-worker.js' \
  --exclude='deploy/DEPLOY.md' \
  --exclude='.github/' \
  --exclude='*.pdf' \
  --exclude='LICENSE' \
  --exclude='USAGE.md' \
  --exclude='PRD.txt' \
  "$ROOT_DIR/" "$STAGE_DIR/"

# 把 self-host 脚本提到顶层方便用户找到
cp "$STAGE_DIR/deploy/self-host/README.md" "$STAGE_DIR/README-DEPLOY.md"

# 写版本标记，update 脚本会复制到主机方便查
echo "$STAMP" > "$STAGE_DIR/.version"

echo "→ 打包 tar.gz ..."
cd "$DIST_DIR"
tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"

echo "→ 打包 zip ..."
zip -rq "${PACKAGE_NAME}.zip" "$PACKAGE_NAME"

echo ""
echo "✅ 打包完成"
echo ""
ls -lh "$DIST_DIR"/*.tar.gz "$DIST_DIR"/*.zip 2>/dev/null
echo ""
echo "传到你的主机后："
echo "  Linux:   tar -xzf ${PACKAGE_NAME}.tar.gz && cd $PACKAGE_NAME && sudo bash deploy/self-host/install-linux.sh"
echo "  Mac:     tar -xzf ${PACKAGE_NAME}.tar.gz && cd $PACKAGE_NAME && bash deploy/self-host/install-mac.sh"
echo "  Windows: 解压 ${PACKAGE_NAME}.zip → 双击 deploy/self-host/install-windows.bat"
