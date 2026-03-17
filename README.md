# Migração do Replit — App de Gestão de Ateliê de Costura

Este repositório contém scripts e instruções para migrar sua aplicação do Replit para um ambiente próprio.

## Pré-requisitos

- Acesso ao painel do Replit (para exportar código e dados)
- Node.js 18+ ou Python 3.10+ (dependendo do stack do seu app)
- PostgreSQL 14+ ou SQLite (dependendo do banco usado no Replit)
- Git

## Passos da Migração

### 1. Exportar o código do Replit

No Replit, acesse seu projeto e faça o download do código:

```bash
# Opção A: pelo menu do Replit
# Clique em ⋮ (três pontos) → Download as ZIP

# Opção B: via CLI do Replit (se disponível)
replit download --project <seu-projeto>
```

Descompacte o ZIP na raiz deste repositório.

### 2. Exportar o banco de dados

Execute o script de exportação no Shell do Replit:

```bash
# Para PostgreSQL (Replit usa Neon ou PostgreSQL interno)
bash scripts/export-db-replit.sh

# Para SQLite
bash scripts/export-sqlite-replit.sh
```

Copie o arquivo `.sql` ou `.db` gerado para `data/backup/`.

### 3. Configurar o ambiente local

```bash
cp .env.example .env
# Edite o .env com suas credenciais locais
bash scripts/setup-env.sh
```

### 4. Importar o banco de dados

```bash
bash scripts/import-db.sh data/backup/dump.sql
```

### 5. Verificar a migração

```bash
bash scripts/verify-migration.sh
```

---

Veja os scripts em `scripts/` para detalhes de cada etapa.
