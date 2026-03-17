#!/usr/bin/env bash
# ============================================================
# verify-migration.sh
# Verifica se a migração foi bem-sucedida.
# ============================================================
set -euo pipefail

ERRORS=0

# Carrega variáveis do .env
if [ -f ".env" ]; then
  set -a; source .env; set +a
fi

echo "=== Verificação da Migração ==="

# 1. Checa conexão com banco
echo ""
echo "--- Banco de dados ---"
if [ -n "${DATABASE_URL:-}" ]; then
  if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo "[OK] Conexão PostgreSQL OK"
    # Lista tabelas
    echo "[INFO] Tabelas encontradas:"
    psql "$DATABASE_URL" -c "\dt" 2>/dev/null | grep -v "^$" | grep -v "List of" | grep -v "Schema" | grep -v "---"
    # Conta registros nas tabelas principais (ajuste os nomes conforme seu schema)
    for TABLE in clientes pedidos produtos servicos pagamentos; do
      COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $TABLE" 2>/dev/null | tr -d ' ' || echo "N/A")
      if [ "$COUNT" != "N/A" ]; then
        echo "  $TABLE: $COUNT registros"
      fi
    done
  else
    echo "[ERRO] Não foi possível conectar ao PostgreSQL"
    ERRORS=$((ERRORS + 1))
  fi
elif [ -f "${SQLITE_DB:-./data/atelie.db}" ]; then
  echo "[OK] Arquivo SQLite encontrado: ${SQLITE_DB:-./data/atelie.db}"
  echo "[INFO] Tabelas:"
  sqlite3 "${SQLITE_DB:-./data/atelie.db}" ".tables"
else
  echo "[AVISO] Nenhum banco configurado. Verifique o .env"
  ERRORS=$((ERRORS + 1))
fi

# 2. Checa dependências do projeto
echo ""
echo "--- Dependências ---"
if [ -f "package.json" ]; then
  if [ -d "node_modules" ]; then
    echo "[OK] node_modules presente"
  else
    echo "[ERRO] node_modules não encontrado. Execute: npm install"
    ERRORS=$((ERRORS + 1))
  fi
elif [ -f "requirements.txt" ]; then
  if [ -d ".venv" ] || python3 -c "import flask" 2>/dev/null || python3 -c "import fastapi" 2>/dev/null; then
    echo "[OK] Dependências Python encontradas"
  else
    echo "[AVISO] Verifique se as dependências Python estão instaladas"
  fi
fi

# 3. Checa variáveis essenciais no .env
echo ""
echo "--- Variáveis de ambiente ---"
for VAR in DATABASE_URL SECRET_KEY; do
  if [ -n "${!VAR:-}" ]; then
    echo "[OK] $VAR configurada"
  else
    echo "[AVISO] $VAR não configurada no .env"
  fi
done

# 4. Resultado final
echo ""
echo "========================="
if [ "$ERRORS" -eq 0 ]; then
  echo "[SUCESSO] Migração verificada sem erros críticos."
else
  echo "[ATENÇÃO] $ERRORS erro(s) encontrado(s). Revise os itens acima."
fi
