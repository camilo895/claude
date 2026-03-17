#!/usr/bin/env bash
# ============================================================
# export-sqlite-replit.sh
# Execute este script NO SHELL DO REPLIT se usar SQLite.
# ============================================================
set -euo pipefail

OUTPUT_DIR="./data/backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$OUTPUT_DIR"

# Localiza arquivos .db ou .sqlite no projeto
DB_FILES=$(find . -maxdepth 3 -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" 2>/dev/null | grep -v node_modules | grep -v .git)

if [ -z "$DB_FILES" ]; then
  echo "[ERRO] Nenhum arquivo SQLite encontrado."
  exit 1
fi

for DB in $DB_FILES; do
  BASENAME=$(basename "$DB" | sed 's/\.[^.]*$//')
  SQL_FILE="$OUTPUT_DIR/${BASENAME}_${TIMESTAMP}.sql"
  echo "[INFO] Exportando $DB → $SQL_FILE"
  sqlite3 "$DB" .dump > "$SQL_FILE"
  # Também copia o arquivo binário como backup extra
  cp "$DB" "$OUTPUT_DIR/${BASENAME}_${TIMESTAMP}.db"
  echo "[OK] $SQL_FILE"
done
