import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import db from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Servir frontend em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')))
}

// ─── COTAÇÕES ──────────────────────────────────────────────────────────────

app.get('/api/cotacoes', (req, res) => {
  const { vendedor, status } = req.query
  let query = 'SELECT * FROM cotacoes WHERE 1=1'
  const params = []

  if (vendedor) {
    query += ' AND vendedor = ?'
    params.push(vendedor)
  }
  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }

  query += ' ORDER BY updated_at DESC'
  const cotacoes = db.prepare(query).all(...params)
  res.json(cotacoes)
})

app.get('/api/cotacoes/:id', (req, res) => {
  const cotacao = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id)
  if (!cotacao) return res.status(404).json({ error: 'Cotação não encontrada' })

  const followups = db
    .prepare('SELECT * FROM followups WHERE cotacao_id = ? ORDER BY data_followup DESC')
    .all(req.params.id)

  const respostas = db
    .prepare('SELECT * FROM respostas_cliente WHERE cotacao_id = ? ORDER BY data_resposta DESC')
    .all(req.params.id)

  res.json({ ...cotacao, followups, respostas })
})

app.post('/api/cotacoes', (req, res) => {
  const { numero, cliente, vendedor, produto, valor, data_cotacao, observacoes } = req.body
  if (!cliente || !vendedor) {
    return res.status(400).json({ error: 'cliente e vendedor são obrigatórios' })
  }

  const stmt = db.prepare(`
    INSERT INTO cotacoes (numero, cliente, vendedor, produto, valor, data_cotacao, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(numero, cliente, vendedor, produto, valor, data_cotacao, observacoes)
  const nova = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(nova)
})

app.put('/api/cotacoes/:id/status', (req, res) => {
  const { status } = req.body
  const validos = ['novo', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido']
  if (!validos.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' })
  }

  db.prepare(`
    UPDATE cotacoes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(status, req.params.id)

  const atualizada = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id)
  if (!atualizada) return res.status(404).json({ error: 'Cotação não encontrada' })
  res.json(atualizada)
})

app.put('/api/cotacoes/:id', (req, res) => {
  const { numero, cliente, vendedor, produto, valor, data_cotacao, observacoes } = req.body

  db.prepare(`
    UPDATE cotacoes
    SET numero = ?, cliente = ?, vendedor = ?, produto = ?, valor = ?,
        data_cotacao = ?, observacoes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(numero, cliente, vendedor, produto, valor, data_cotacao, observacoes, req.params.id)

  const atualizada = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id)
  if (!atualizada) return res.status(404).json({ error: 'Cotação não encontrada' })
  res.json(atualizada)
})

app.delete('/api/cotacoes/:id', (req, res) => {
  const result = db.prepare('DELETE FROM cotacoes WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Cotação não encontrada' })
  res.json({ ok: true })
})

// ─── IMPORTAÇÃO ─────────────────────────────────────────────────────────────

app.post('/api/cotacoes/importar', (req, res) => {
  const { cotacoes } = req.body
  if (!Array.isArray(cotacoes) || cotacoes.length === 0) {
    return res.status(400).json({ error: 'Nenhuma cotação para importar' })
  }

  const stmt = db.prepare(`
    INSERT INTO cotacoes (numero, cliente, vendedor, produto, valor, data_cotacao, observacoes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const inserir = db.transaction((items) => {
    let count = 0
    for (const c of items) {
      if (!c.cliente || !c.vendedor) continue
      stmt.run(
        c.numero || null,
        c.cliente,
        c.vendedor,
        c.produto || null,
        parseFloat(c.valor) || null,
        c.data_cotacao || null,
        c.observacoes || null,
        c.status || 'novo'
      )
      count++
    }
    return count
  })

  const count = inserir(cotacoes)
  res.json({ importadas: count })
})

// ─── FOLLOW-UPS ─────────────────────────────────────────────────────────────

app.post('/api/cotacoes/:id/followups', (req, res) => {
  const { tipo, descricao, resultado, vendedor } = req.body
  if (!tipo || !descricao || !vendedor) {
    return res.status(400).json({ error: 'tipo, descricao e vendedor são obrigatórios' })
  }

  const result = db.prepare(`
    INSERT INTO followups (cotacao_id, tipo, descricao, resultado, vendedor)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, tipo, descricao, resultado || null, vendedor)

  // Atualizar updated_at da cotação
  db.prepare('UPDATE cotacoes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id)

  const followup = db.prepare('SELECT * FROM followups WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(followup)
})

// ─── RESPOSTAS DO CLIENTE ───────────────────────────────────────────────────

app.post('/api/cotacoes/:id/respostas', (req, res) => {
  const { resposta } = req.body
  if (!resposta) {
    return res.status(400).json({ error: 'resposta é obrigatória' })
  }

  const result = db.prepare(`
    INSERT INTO respostas_cliente (cotacao_id, resposta)
    VALUES (?, ?)
  `).run(req.params.id, resposta)

  db.prepare('UPDATE cotacoes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id)

  const nova = db.prepare('SELECT * FROM respostas_cliente WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(nova)
})

// ─── VENDEDORES (lista única) ─────────────────────────────────────────────

app.get('/api/vendedores', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT vendedor FROM cotacoes ORDER BY vendedor').all()
  res.json(rows.map(r => r.vendedor))
})

// ─── Fallback SPA ────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})
