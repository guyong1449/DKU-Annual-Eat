#!/bin/bash
set -u
APP_DIR="$(cd -P -- "$(dirname -- "$0")" && pwd)" || exit 1
fail() {
  printf '%s\n' "$1"
  if [ -t 0 ]; then read -r -p '按回车关闭…' _; fi
  exit 1
}
[ "$(/usr/bin/uname -s)" = 'Darwin' ] || fail '此启动文件仅适用于 macOS。'
OS_VERSION="$(/usr/bin/sw_vers -productVersion)"
IFS=. read -r OS_MAJOR OS_MINOR _ <<< "$OS_VERSION"
if [ "$OS_MAJOR" -lt 13 ] || { [ "$OS_MAJOR" -eq 13 ] && [ "$OS_MINOR" -lt 5 ]; }; then
  fail '需要 macOS 13.5 或更高版本。'
fi
if [ -f "$APP_DIR/runtime/architecture" ]; then
  EXPECTED_ARCH="$(cat "$APP_DIR/runtime/architecture")"
  ARM_CAPABLE="$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null || printf '0')"
  if [ "$EXPECTED_ARCH" = 'arm64' ] && [ "$ARM_CAPABLE" != '1' ]; then
    fail '这是 Apple 芯片版，请为 Intel Mac 下载 x64 版。'
  fi
  if [ "$EXPECTED_ARCH" = 'x64' ] && [ "$ARM_CAPABLE" = '1' ]; then
    fail '这是 Intel 版，请为 Apple 芯片 Mac 下载 arm64 版。'
  fi
fi
if [ -x "$APP_DIR/runtime/node" ]; then
  NODE="$APP_DIR/runtime/node"
elif [ -e "$APP_DIR/runtime/node" ]; then
  fail '包内运行环境缺少执行权限，请使用访达重新解压原始 ZIP。'
else
  NODE="$(command -v node)" || fail '未找到 Node.js。请下载包含运行环境的 macOS 免安装包。'
fi
"$NODE" "$APP_DIR/scripts/launch.cjs" || fail '启动失败，请查看 private/launcher.log。'
printf '%s\n' '工具已打开，可以关闭此终端窗口。'
