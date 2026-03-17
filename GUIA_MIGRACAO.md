# Guia Completo de Migração do Replit

## Visão Geral

```
Replit (origem)          →    Ambiente Local / Servidor (destino)
─────────────────────────────────────────────────────────────────
Código do app            →    Este repositório (git)
Banco de dados           →    PostgreSQL ou SQLite local
Secrets / variáveis      →    Arquivo .env
Uploads / imagens        →    Pasta uploads/
```

---

## Passo a Passo

### Etapa 1 — Exportar o código do Replit

1. Abra seu projeto no Replit
2. Clique nos **três pontos (⋮)** no canto superior esquerdo
3. Selecione **"Download as ZIP"**
4. Descompacte o conteúdo na pasta raiz deste repositório

### Etapa 2 — Exportar as Secrets do Replit

1. No painel do Replit, vá em **Secrets** (ícone de cadeado)
2. Anote todas as variáveis (DATABASE_URL, chaves de API, etc.)
3. Copie os valores para o seu `.env` local (veja `.env.example`)

### Etapa 3 — Exportar o banco de dados

#### Se usar PostgreSQL (Neon / Replit DB):

No **Shell do Replit**, execute:
```bash
bash scripts/export-db-replit.sh
```

Isso gera um arquivo `data/backup/dump_TIMESTAMP.sql`.

Baixe esse arquivo (pode usar o gerenciador de arquivos do Replit).

#### Se usar SQLite:

```bash
bash scripts/export-sqlite-replit.sh
```

Baixe os arquivos `.sql` e `.db` gerados em `data/backup/`.

### Etapa 4 — Configurar o ambiente local

```bash
# Clone este repositório (se ainda não fez)
git clone <url-do-repo>
cd <pasta>

# Copie o código exportado do Replit para cá

# Configure o ambiente
bash scripts/setup-env.sh

# Edite o .env com suas credenciais
nano .env
```

### Etapa 5 — Importar o banco de dados

```bash
bash scripts/import-db.sh data/backup/dump_SEU_TIMESTAMP.sql
```

### Etapa 6 — Verificar a migração

```bash
bash scripts/verify-migration.sh
```

### Etapa 7 — Testar a aplicação

```bash
# Node.js
npm start   # ou: npm run dev

# Python
python app.py   # ou: uvicorn main:app
```

---

## Dicas para App de Ateliê de Costura

### Tabelas comuns a verificar após migração:
- `clientes` — cadastro de clientes
- `pedidos` / `ordens_servico` — pedidos e encomendas
- `produtos` / `itens` — peças e modelos
- `medidas` — medidas dos clientes
- `pagamentos` / `financeiro` — controle financeiro
- `materiais` / `tecidos` — estoque de materiais
- `servicos` — tipos de serviço

### Arquivos que podem precisar de atenção:
- **Fotos de produtos/peças**: provavelmente em `uploads/` ou `public/images/`
- **Relatórios gerados**: PDFs em alguma pasta temporária do Replit

### Problemas comuns:

| Problema | Solução |
|---|---|
| `ECONNREFUSED` no banco | PostgreSQL local não está rodando: `sudo service postgresql start` |
| Tabelas não encontradas | O dump não foi importado corretamente — re-execute o import |
| `MODULE_NOT_FOUND` | Execute `npm install` novamente |
| Porta em uso | Mude `PORT` no `.env` |
| Imagens não aparecem | Copie a pasta `uploads/` do Replit para cá |

---

## Hospedar em Servidor (opcional)

Após migrar localmente, para colocar em produção:

- **Railway / Render / Fly.io**: conectam com GitHub, suportam PostgreSQL
- **VPS (DigitalOcean, Hetzner)**: mais controle, use PM2 (Node) ou Gunicorn (Python)
- **Docker**: use `docker-compose.yml` para empacotar app + banco

Se precisar de ajuda com qualquer uma dessas etapas, é só pedir!
