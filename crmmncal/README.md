# CRM Mancal

Sistema de Gestão Comercial para distribuição de mancais e rolamentos.

## Módulos

| Módulo | Descrição |
|--------|-----------|
| **Tabela de Preços** | Consulta com simulação de margem por região (SP, Sul/Sudeste, N/NE/CO/ES) |
| **Cotações** | Criação, PDF profissional, envio via WhatsApp |
| **CRM** | Pipeline Kanban, follow-ups automáticos, registro de atividades |
| **Performance** | Meta mensal, cotações/dia, taxa de conversão, projeção |
| **Configurações** | Upload de planilha, parametrização de follow-up, metas, equipe |

## Stack

- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes
- **Banco:** PostgreSQL + Prisma ORM
- **Auth:** Google OAuth (NextAuth.js)
- **PDF:** @react-pdf/renderer
- **Deploy:** Vercel + Neon/Supabase

## Setup Rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 3. Iniciar PostgreSQL e criar banco
# (se local) createdb crmmncal

# 4. Rodar migrations
npm run db:migrate

# 5. Popular com dados de exemplo
npm run db:seed

# 6. Iniciar servidor
npm run dev
```

Acesse http://localhost:3000

### Modo Desenvolvimento (sem Google OAuth)

Em desenvolvimento, um login simplificado está disponível na tela de login.
Basta informar nome e email para entrar com acesso de Diretor.

## Deploy em Produção

### 1. Banco de Dados (Neon - gratuito)

1. Crie uma conta em [neon.tech](https://neon.tech)
2. Crie um projeto e copie a connection string
3. Rode: `DATABASE_URL="sua-url" npx prisma migrate deploy`

### 2. Google OAuth

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um OAuth Client ID (tipo: Web application)
3. Authorized redirect URI: `https://seudominio.com/api/auth/callback/google`
4. Copie Client ID e Client Secret para o `.env`

### 3. Vercel

1. Conecte o repositório no [vercel.com](https://vercel.com)
2. Configure as variáveis de ambiente (DATABASE_URL, GOOGLE_CLIENT_ID, etc.)
3. Deploy automático

## Comandos

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run db:migrate   # Rodar migrations
npm run db:seed      # Popular banco com dados de exemplo
npm run db:studio    # Abrir Prisma Studio (visualizar dados)
```

## Estrutura de Preços

Fórmula: `Preço = Custo × (1 + Margem%) × (1 + Fator Tributário Regional%)`

| Região | Fator |
|--------|-------|
| São Paulo | 9,1204% |
| Sul/Sudeste | 15,6990% |
| N/NE/CO/ES | 12,9736% |

## Roles

| Perfil | Permissões |
|--------|-----------|
| Vendedor | Consultar preço, criar cotação, ver próprio CRM e meta |
| Coordenador | + aprovar descontos, parametrizar follow-up, ver equipe |
| Gerente | + relatórios de performance da equipe |
| Diretor | Acesso total + configurações estratégicas |
