#!/usr/bin/env bash
# Crea un ZIP portable con TODO el proyecto listo para compilar el instalador en Windows
set -e
cd "$(dirname "$0")/.."

OUT="download/POS-Pro-Fuente-Completo.zip"
rm -f "$OUT"

# Excluir lo que no se debe empaquetar (build artifacts, dependencias, etc.)
zip -r "$OUT" . \
  -x "node_modules/*" \
  -x ".next/*" \
  -x "dist/*" \
  -x "build-resources/server/*" \
  -x "build-resources/template.db" \
  -x "installer/Output/*" \
  -x "db/*.db" \
  -x "db/*.db-journal" \
  -x "*.log" \
  -x "download/*" \
  -x "upload/*" \
  -x "tests/*" \
  -x "examples/*" \
  -x "skills/*" \
  -x "mini-services/node_modules/*" \
  -x "electron/node_modules/*" \
  -x ".git/*" \
  -x "*.exe" "*.msi" "*.app" \
  -q

SIZE=$(du -h "$OUT" | cut -f1)
echo "✓ ZIP creado: $OUT ($SIZE)"
ls -lh "$OUT"
