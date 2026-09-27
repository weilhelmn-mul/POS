#!/usr/bin/env bash
# ============================================================
# POS Pro - Build completo del instalador (Linux/macOS host)
# ============================================================
# Genera la app Electron empaquetada para Windows.
# El .exe final de Inno Setup solo puede compilarse en Windows
# (ISCC no corre en Linux), así que en Linux/macOS este script
# deja todo listo en dist/win-unpacked y el usuario debe correr
# `iscc installer/pos-pro.iss` en una máquina Windows.
# ============================================================
set -e
cd "$(dirname "$0")/.."

echo "==> Empaquetando app de escritorio para win32..."
bun run package:win

echo ""
echo "==> Listo. Para generar el instalador .exe:"
echo "    Copia la carpeta dist/ y installer/ a una máquina Windows"
echo "    con Inno Setup instalado y ejecuta:"
echo "    iscc installer\\pos-pro.iss"
