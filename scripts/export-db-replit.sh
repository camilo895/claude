#!/usr/bin/env bash
# ============================================================
# export-db-replit.sh
# Execute este script NO SHELL DO REPLIT para exportar o banco.
# ============================================================
set -euo pipefail

OUTPUT_DIR="./data/backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="$OUTPUT_DIR/dump_${TIMESTAMP}.sql"

mkdir -p "$OUTPUT_DIR"

# ---- PostgreSQL (Replit / Neon) ----
if [ -n "${DATABASE_URL:-}" ]; then
  echo "[INFO] DATABASE_URL detectada. Exportando PostgreSQL..."
  pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-acl \
    --format=plain \
    --file="$OUTPUT_FILE"
  echo "[OK] Dump salvo em: $OUTPUT_FILE"
  exit 0
fi

# ---- PostgreSQL via variáveis individuais ----
if [ -n "${PGDATABASE:-}" ]; then
  echo "[INFO] Exportando via variáveis PGHOST/PGDATABASE..."
  pg_dump \
    --host="${PGHOST:-localhost}" \
    --port="${PGPORT:-5432}" \
    --username="${PGUSER:-postgres}" \
    --dbname="$PGDATABASE" \
    --no-owner \
    --no-acl \
    --format=plain \
    --file="$OUTPUT_FILE"
  echo "[OK] Dump salvo em: $OUTPUT_FILE"
  exit 0
fi

echo "[ERRO] Nenhuma variável de banco encontrada (DATABASE_URL ou PGDATABASE)."
echo "       Verifique as Secrets do seu Replit."
exit 1
