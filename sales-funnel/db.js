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
    cliente TEXT NOT NULL,
    vendedor TEXT NOT NULL,
    produto TEXT,
    valor REAL,
    data_cotacao TEXT,
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

export default db
