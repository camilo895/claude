#!/usr/bin/env bash
# ============================================================
# import-db.sh <arquivo.sql>
# Importa o dump para o banco local (PostgreSQL ou SQLite).
# ============================================================
set -euo pipefail

DUMP_FILE="${1:-}"

if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "Uso: bash scripts/import-db.sh data/backup/dump.sql"
  exit 1
fi

# Carrega variáveis do .env se existir
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

# ---- Detecta PostgreSQL ----
if [ -n "${DATABASE_URL:-}" ] || [ -n "${PGDATABASE:-}" ]; then
  echo "[INFO] Importando para PostgreSQL..."

  if [ -n "${DATABASE_URL:-}" ]; then
    psql "$DATABASE_URL" -f "$DUMP_FILE"
  else
    psql \
      --host="${PGHOST:-localhost}" \
      --port="${PGPORT:-5432}" \
      --username="${PGUSER:-postgres}" \
      --dbname="$PGDATABASE" \
      -f "$DUMP_FILE"
  fi

  echo "[OK] Importação PostgreSQL concluída."
  exit 0
fi

# ---- Detecta SQLite ----
if echo "$DUMP_FILE" | grep -qi "\.sql$"; then
  SQLITE_TARGET="${SQLITE_DB:-./data/atelie.db}"
  echo "[INFO] Importando para SQLite em: $SQLITE_TARGET"
  sqlite3 "$SQLITE_TARGET" < "$DUMP_FILE"
  echo "[OK] Importação SQLite concluída."
  exit 0
fi

echo "[ERRO] Não foi possível detectar o banco de destino."
echo "       Configure DATABASE_URL ou PGDATABASE no .env"
exit 1
