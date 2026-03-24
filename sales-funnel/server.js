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

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')))
}

// ─── COTAÇÕES ──────────────────────────────────────────────────────────────

app.get('/api/cotacoes', (req, res) => {
  const { vendedor, status } = req.query
  let query = 'SELECT * FROM cotacoes WHERE 1=1'
  const params = []

  if (vendedor) { query += ' AND vendedor = ?'; params.push(vendedor) }
  if (status)   { query += ' AND status = ?';   params.push(status)   }

  query += ' ORDER BY updated_at DESC'
  res.json(db.prepare(query).all(...params))
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
  const {
    numero, numero_vendedor, comprador, vendedor,
    estado, cidade, produto, frete, lista_preco, quantidade_total,
    data_cotacao, observacoes
  } = req.body

  const cliente = comprador || req.body.cliente
  if (!cliente || !vendedor) {
    return res.status(400).json({ error: 'comprador e vendedor são obrigatórios' })
  }

  const result = db.prepare(`
    INSERT INTO cotacoes
      (numero, numero_vendedor, comprador, vendedor, estado, cidade,
       produto, frete, lista_preco, quantidade_total, data_cotacao, observacoes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    numero, numero_vendedor, cliente, vendedor,
    estado, cidade, produto,
    parseFloat(frete) || null,
    parseFloat(lista_preco) || null,
    parseInt(quantidade_total) || null,
    data_cotacao, observacoes
  )

  res.status(201).json(db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(result.lastInsertRowid))
})

app.put('/api/cotacoes/:id/status', (req, res) => {
  const { status } = req.body
  const validos = ['novo', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido']
  if (!validos.includes(status)) return res.status(400).json({ error: 'Status inválido' })

  db.prepare('UPDATE cotacoes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, req.params.id)

  const atualizada = db.prepare('SELECT * FROM cotacoes WHERE id = ?').get(req.params.id)
  if (!atualizada) return res.status(404).json({ error: 'Cotação não encontrada' })
  res.json(atualizada)
})

app.put('/api/cotacoes/:id', (req, res) => {
  const {
    numero, numero_vendedor, comprador, vendedor,
    estado, cidade, produto, frete, lista_preco, quantidade_total,
    data_cotacao, observacoes
  } = req.body

  const cliente = comprador || req.body.cliente

  db.prepare(`
    UPDATE cotacoes
    SET numero = ?, numero_vendedor = ?, comprador = ?, vendedor = ?,
        estado = ?, cidade = ?, produto = ?, frete = ?, lista_preco = ?,
        quantidade_total = ?, data_cotacao = ?, observacoes = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    numero, numero_vendedor, cliente, vendedor,
    estado, cidade, produto,
    parseFloat(frete) || null,
    parseFloat(lista_preco) || null,
    parseInt(quantidade_total) || null,
    data_cotacao, observacoes,
    req.params.id
  )

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

// Normaliza status vindos da planilha para os stages do funil
function normalizarStatus(raw) {
  if (!raw) return 'novo'
  const s = raw.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
  if (['novo', 'new', 'aberto', 'criado', 'pendente'].some(x => s.includes(x))) return 'novo'
  if (['contato', 'primeiro', 'ligacao', 'ligou', 'contactado'].some(x => s.includes(x))) return 'contato'
  if (['proposta', 'orcamento', 'enviado', 'cotacao enviada'].some(x => s.includes(x))) return 'proposta'
  if (['negociacao', 'negociando', 'tratativa', 'andamento'].some(x => s.includes(x))) return 'negociacao'
  if (['aprovado', 'ganho', 'fechado', 'won', 'vendido', 'confirmado'].some(x => s.includes(x))) return 'ganho'
  if (['reprovado', 'perdido', 'cancelado', 'lost', 'recusado', 'sem retorno'].some(x => s.includes(x))) return 'perdido'
  return 'novo'
}

app.post('/api/cotacoes/importar', (req, res) => {
  const { cotacoes } = req.body
  if (!Array.isArray(cotacoes) || cotacoes.length === 0) {
    return res.status(400).json({ error: 'Nenhuma cotação para importar' })
  }

  const stmt = db.prepare(`
    INSERT INTO cotacoes
      (numero, numero_vendedor, comprador, vendedor, estado, cidade,
       produto, frete, lista_preco, quantidade_total, data_cotacao, observacoes, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `)

  const inserir = db.transaction((items) => {
    let count = 0
    for (const c of items) {
      const cliente = c.comprador || c.cliente
      const vendedor = c.vendedor || c.numero_vendedor
      if (!cliente || !vendedor) continue

      stmt.run(
        c.numero || null,
        c.numero_vendedor || null,
        cliente,
        vendedor,
        c.estado || null,
        c.cidade || null,
        c.produto || null,
        parseFloat(String(c.frete || '').replace(/[^\d.,]/g, '').replace(',', '.')) || null,
        parseFloat(String(c.lista_preco || '').replace(/[^\d.,]/g, '').replace(',', '.')) || null,
        parseInt(c.quantidade_total) || null,
        c.data_cotacao || c.data || null,
        c.observacoes || null,
        normalizarStatus(c.status)
      )
      count++
    }
    return count
  })

  res.json({ importadas: inserir(cotacoes) })
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

  db.prepare('UPDATE cotacoes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id)
  res.status(201).json(db.prepare('SELECT * FROM followups WHERE id = ?').get(result.lastInsertRowid))
})

// ─── RESPOSTAS DO CLIENTE ───────────────────────────────────────────────────

app.post('/api/cotacoes/:id/respostas', (req, res) => {
  const { resposta } = req.body
  if (!resposta) return res.status(400).json({ error: 'resposta é obrigatória' })

  const result = db.prepare(`
    INSERT INTO respostas_cliente (cotacao_id, resposta) VALUES (?, ?)
  `).run(req.params.id, resposta)

  db.prepare('UPDATE cotacoes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id)
  res.status(201).json(db.prepare('SELECT * FROM respostas_cliente WHERE id = ?').get(result.lastInsertRowid))
})

// ─── VENDEDORES ──────────────────────────────────────────────────────────────

app.get('/api/vendedores', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT vendedor FROM cotacoes ORDER BY vendedor').all()
  res.json(rows.map(r => r.vendedor))
})

// ─── Fallback SPA ────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')))
}

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`))
