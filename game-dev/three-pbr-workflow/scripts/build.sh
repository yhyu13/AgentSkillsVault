#!/bin/bash
# build.sh - 把模板复制到 dist/ 并启动本地服务器
# 用法: bash scripts/build.sh [template-name] [--serve]
#   template-name: showcase | product | blank | gltf (默认 showcase)
#   --serve: 启动 python http server

set -e

TEMPLATE="${1:-showcase}"
SERVE=""

for arg in "$@"; do
  case $arg in
    --serve) SERVE="1" ;;
  esac
done

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_FILE="$SKILL_DIR/templates/template-${TEMPLATE}.html"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "❌ Template not found: $TEMPLATE_FILE"
  echo "Available: showcase, product, blank, gltf"
  exit 1
fi

DIST_DIR="$SKILL_DIR/dist"
mkdir -p "$DIST_DIR"
cp "$TEMPLATE_FILE" "$DIST_DIR/index.html"

echo "✅ Built: $DIST_DIR/index.html (from $TEMPLATE)"
echo ""
echo "Open: file://$DIST_DIR/index.html"
echo "Or run with HTTP server:"

if [ -n "$SERVE" ]; then
  cd "$DIST_DIR"
  PORT=8080
  echo "Starting http server on http://localhost:$PORT"
  python3 -m http.server $PORT
else
  echo "  cd $DIST_DIR && python3 -m http.server 8080"
fi
