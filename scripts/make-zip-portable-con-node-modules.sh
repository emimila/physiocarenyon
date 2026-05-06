#!/bin/sh
# ZIP “portatile”: include node_modules (NON serve npm install dopo lo unzip).
# ATTENZIONE: file molto grande e lento; utile se non puoi usare npm sul PC destinazione.
# Esegue comunque npm install prima di zippare, così node_modules è completo.
set -e
STAMP="$(date +%Y%m%d-%H%M)"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(dirname "$PROJECT_DIR")/progetto-PORTATILE-node_modules-${STAMP}.zip"
PARENT="$(dirname "$PROJECT_DIR")"
NAME="$(basename "$PROJECT_DIR")"

echo ">>> npm install..."
(cd "$PROJECT_DIR" && npm install)

echo ">>> Creazione ZIP (include node_modules, esclude solo .git)..."
cd "$PARENT"
zip -r "$OUT" "$NAME" \
  -x "${NAME}/.git/*" \
  -x "${NAME}/.git/**"

echo "Creato: $OUT"
ls -lh "$OUT"
