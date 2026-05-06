#!/bin/sh
# Archivio del progetto: prima esegue npm install, poi crea lo ZIP (senza node_modules e .git).
# Output: nella cartella che contiene il progetto (es. Desktop), nome progetto-completo-AAAAMMGG-HHMM.zip
set -e
STAMP="$(date +%Y%m%d-%H%M)"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(dirname "$PROJECT_DIR")/progetto-completo-${STAMP}.zip"
PARENT="$(dirname "$PROJECT_DIR")"
NAME="$(basename "$PROJECT_DIR")"

echo ">>> npm install nel progetto (dipendenze allineate al lockfile)..."
(cd "$PROJECT_DIR" && npm install)

cd "$PARENT"
zip -r "$OUT" "$NAME" \
  -x "${NAME}/node_modules/*" \
  -x "${NAME}/node_modules/**" \
  -x "${NAME}/.git/*" \
  -x "${NAME}/.git/**"

echo "Creato: $OUT"
ls -lh "$OUT"
