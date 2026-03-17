#!/usr/bin/env bash
# ============================================================
# setup-env.sh
# Configura o ambiente local após copiar o código do Replit.
# ============================================================
set -euo pipefail

echo "=== Setup do Ambiente — Ateliê de Costura ==="

# 1. Detecta o tipo de projeto
if [ -f "package.json" ]; then
  STACK="node"
elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
  STACK="python"
else
  echo "[AVISO] Tipo de projeto não detectado. Verifique manualmente."
  STACK="unknown"
fi

echo "[INFO] Stack detectado: $STACK"

# 2. Instala dependências
case "$STACK" in
  node)
    echo "[INFO] Instalando dependências Node.js..."
    if [ -f "package-lock.json" ]; then
      npm ci
    else
      npm install
    fi
    ;;
  python)
    echo "[INFO] Criando ambiente virtual Python..."
    python3 -m venv .venv
    source .venv/bin/activate
    if [ -f "requirements.txt" ]; then
      pip install -r requirements.txt
    elif [ -f "pyproject.toml" ]; then
      pip install -e .
    fi
    ;;
esac

# 3. Cria .env se não existir
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo "[OK] .env criado a partir de .env.example"
  echo "     -> Edite o .env com suas credenciais antes de continuar."
fi

# 4. Cria banco de dados local (PostgreSQL)
if [ -n "${PGDATABASE:-}" ]; then
  echo "[INFO] Criando banco '$PGDATABASE' se não existir..."
  createdb "$PGDATABASE" 2>/dev/null && echo "[OK] Banco criado." || echo "[INFO] Banco já existe."
fi

echo ""
echo "=== Próximos passos ==="
echo "1. Edite o .env com suas credenciais"
echo "2. Execute: bash scripts/import-db.sh data/backup/dump.sql"
echo "3. Execute: bash scripts/verify-migration.sh"
