import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'funil.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS cotacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT,
    numero_vendedor TEXT,
    comprador TEXT NOT NULL,
    vendedor TEXT NOT NULL,
    estado TEXT,
    cidade TEXT,
    produto TEXT,
    frete REAL,
    lista_preco REAL,
    quantidade_total INTEGER,
    valor_total REAL,
    status TEXT DEFAULT 'novo',
    observacoes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cotacao_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    resultado TEXT,
    data_followup DATETIME DEFAULT CURRENT_TIMESTAMP,
    vendedor TEXT NOT NULL,
    FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS respostas_cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cotacao_id INTEGER NOT NULL,
    resposta TEXT NOT NULL,
    data_resposta DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id) ON DELETE CASCADE
  );
`)

// Migração segura: adicionar colunas novas se o banco já existia
const colunas = db.prepare("PRAGMA table_info(cotacoes)").all().map(c => c.name)
const novasColunas = [
  { nome: 'numero_vendedor', def: 'TEXT' },
  { nome: 'comprador',       def: 'TEXT' },
  { nome: 'estado',          def: 'TEXT' },
  { nome: 'cidade',          def: 'TEXT' },
  { nome: 'frete',           def: 'REAL' },
  { nome: 'lista_preco',     def: 'REAL' },
  { nome: 'quantidade_total',def: 'INTEGER' },
  { nome: 'valor_total',     def: 'REAL' },
]
for (const col of novasColunas) {
  if (!colunas.includes(col.nome)) {
    db.exec(`ALTER TABLE cotacoes ADD COLUMN ${col.nome} ${col.def}`)
  }
}

export default db
