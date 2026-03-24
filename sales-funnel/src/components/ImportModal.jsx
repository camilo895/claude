import { useState, useRef } from 'react'
import { API } from '../constants.js'

const COLUNAS_ESPERADAS = ['numero', 'cliente', 'vendedor', 'produto', 'valor', 'data_cotacao', 'observacoes']
const COLUNAS_LABEL = {
  numero: 'Nº Cotação',
  cliente: 'Cliente',
  vendedor: 'Vendedor',
  produto: 'Produto/Serviço',
  valor: 'Valor',
  data_cotacao: 'Data',
  observacoes: 'Observações',
}

// Tenta mapear automaticamente colunas da planilha → campos do sistema
function autoMapear(headers) {
  const map = {}
  const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '')

  const aliases = {
    numero: ['numero', 'num', 'cod', 'codigo', 'cotacao', 'id', 'pedido'],
    cliente: ['cliente', 'razaosocial', 'empresa', 'comprador', 'nome'],
    vendedor: ['vendedor', 'representante', 'consultor', 'agente', 'responsavel'],
    produto: ['produto', 'servico', 'item', 'descricao', 'material', 'projeto'],
    valor: ['valor', 'preco', 'total', 'montante', 'venda', 'rs', 'r$'],
    data_cotacao: ['data', 'datacotacao', 'datapedido', 'emissao', 'dataemissao'],
    observacoes: ['observacao', 'obs', 'nota', 'anotacao', 'comentario'],
  }

  headers.forEach(h => {
    const norm = normalize(h)
    for (const [campo, als] of Object.entries(aliases)) {
      if (als.some(a => norm.includes(a) || a.includes(norm))) {
        if (!Object.values(map).includes(campo)) {
          map[h] = campo
        }
        break
      }
    }
  })
  return map
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  // Detectar delimitador
  const firstLine = lines[0]
  const delimiters = [';', ',', '\t', '|']
  const delimiter = delimiters.reduce((best, d) =>
    (firstLine.split(d).length > firstLine.split(best).length ? d : best), ',')

  const parseRow = (line) => {
    const result = []
    let inQuote = false
    let current = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuote = !inQuote
      } else if (ch === delimiter && !inQuote) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).filter(l => l.trim()).map(parseRow)
  return { headers, rows, delimiter }
}

export default function ImportModal({ onFechar, onConcluida }) {
  const [etapa, setEtapa] = useState('upload') // upload | mapear | preview | importando
  const [parsed, setParsed] = useState(null)
  const [mapeamento, setMapeamento] = useState({})
  const [preview, setPreview] = useState([])
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState(null)
  const [arrastando, setArrastando] = useState(false)
  const inputRef = useRef()

  const processarArquivo = (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'txt'].includes(ext)) {
      setErro('Por favor, envie um arquivo .csv ou .txt')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        // Tentar UTF-8 primeiro, depois latin1
        let text = e.target.result
        const { headers, rows } = parseCSV(text)
        if (headers.length === 0) {
          setErro('Arquivo vazio ou formato inválido')
          return
        }
        const mapa = autoMapear(headers)
        setParsed({ headers, rows, fileName: file.name })
        setMapeamento(mapa)
        setEtapa('mapear')
        setErro(null)
      } catch (err) {
        setErro('Erro ao processar o arquivo: ' + err.message)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleFile = (e) => processarArquivo(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setArrastando(false)
    processarArquivo(e.dataTransfer.files[0])
  }

  const handleConfirmarMapeamento = () => {
    if (!parsed) return

    // Validar que cliente e vendedor estão mapeados
    const campos = Object.values(mapeamento)
    if (!campos.includes('cliente') || !campos.includes('vendedor')) {
      setErro('Os campos Cliente e Vendedor são obrigatórios no mapeamento')
      return
    }

    // Gerar preview
    const rows = parsed.rows.slice(0, 5).map(row => {
      const obj = {}
      parsed.headers.forEach((h, i) => {
        if (mapeamento[h]) obj[mapeamento[h]] = row[i]
      })
      return obj
    })
    setPreview(rows)
    setEtapa('preview')
    setErro(null)
  }

  const handleImportar = async () => {
    if (!parsed) return
    setImportando(true)
    setEtapa('importando')

    try {
      const cotacoes = parsed.rows.map(row => {
        const obj = {}
        parsed.headers.forEach((h, i) => {
          if (mapeamento[h]) {
            let val = row[i] || ''
            // Limpar valor monetário
            if (mapeamento[h] === 'valor') {
              val = val.replace(/[R$\s.]/g, '').replace(',', '.')
            }
            obj[mapeamento[h]] = val
          }
        })
        return obj
      }).filter(c => c.cliente && c.vendedor)

      const res = await fetch(`${API}/cotacoes/importar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotacoes }),
      })

      if (!res.ok) throw new Error('Erro ao importar')
      const data = await res.json()
      setResultado(data)
    } catch (e) {
      setErro(e.message)
      setEtapa('preview')
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📂 Importar Planilha</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {etapa === 'upload' && 'Selecione seu arquivo CSV'}
              {etapa === 'mapear' && `${parsed?.fileName} — Mapeie as colunas`}
              {etapa === 'preview' && 'Confirme os dados antes de importar'}
              {etapa === 'importando' && 'Importando...'}
            </p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Progresso */}
        <div className="px-6 py-3 flex items-center gap-2 border-b border-gray-100 bg-gray-50">
          {['upload', 'mapear', 'preview'].map((e_, i) => (
            <div key={e_} className="flex items-center gap-2">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${etapa === e_ ? 'bg-blue-600 text-white' :
                  ['mapear', 'preview', 'importando'].indexOf(etapa) > i ? 'bg-green-500 text-white' :
                  'bg-gray-200 text-gray-500'}
              `}>
                {['mapear', 'preview', 'importando'].indexOf(etapa) > i ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${etapa === e_ ? 'text-blue-600' : 'text-gray-400'}`}>
                {e_ === 'upload' ? 'Arquivo' : e_ === 'mapear' ? 'Colunas' : 'Confirmar'}
              </span>
              {i < 2 && <div className="h-px w-6 bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
              <span>⚠️ {erro}</span>
              <button onClick={() => setErro(null)} className="text-red-400">✕</button>
            </div>
          )}

          {/* Etapa 1: Upload */}
          {etapa === 'upload' && (
            <div className="space-y-4">
              <div
                className={`
                  border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                  ${arrastando ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
                `}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setArrastando(true) }}
                onDragLeave={() => setArrastando(false)}
                onDrop={handleDrop}
              >
                <p className="text-5xl mb-3">{arrastando ? '📥' : '📊'}</p>
                <p className="font-semibold text-gray-700">
                  {arrastando ? 'Solte o arquivo aqui' : 'Clique ou arraste seu arquivo'}
                </p>
                <p className="text-sm text-gray-400 mt-1">Formatos aceitos: .csv, .txt</p>
                <input ref={inputRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">📋 Formato esperado da planilha</p>
                <p className="text-xs text-blue-600 mb-2">Seu arquivo CSV pode ter qualquer nome de coluna. Você irá mapeá-las no próximo passo. Mas para facilitar, recomendamos estas colunas:</p>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="bg-blue-100 px-3 py-1 text-left text-blue-800 border border-blue-200">numero</th>
                        <th className="bg-blue-100 px-3 py-1 text-left text-blue-800 border border-blue-200">cliente</th>
                        <th className="bg-blue-100 px-3 py-1 text-left text-blue-800 border border-blue-200">vendedor</th>
                        <th className="bg-blue-100 px-3 py-1 text-left text-blue-800 border border-blue-200">produto</th>
                        <th className="bg-blue-100 px-3 py-1 text-left text-blue-800 border border-blue-200">valor</th>
                        <th className="bg-blue-100 px-3 py-1 text-left text-blue-800 border border-blue-200">data</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-1 border border-blue-100 text-blue-700">001</td>
                        <td className="px-3 py-1 border border-blue-100 text-blue-700">Empresa ABC</td>
                        <td className="px-3 py-1 border border-blue-100 text-blue-700">João Silva</td>
                        <td className="px-3 py-1 border border-blue-100 text-blue-700">Produto X</td>
                        <td className="px-3 py-1 border border-blue-100 text-blue-700">5000</td>
                        <td className="px-3 py-1 border border-blue-100 text-blue-700">2025-03-24</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Etapa 2: Mapeamento */}
          {etapa === 'mapear' && parsed && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Seu arquivo tem <strong>{parsed.rows.length} linha(s)</strong> e <strong>{parsed.headers.length} coluna(s)</strong>.
                Para cada coluna da sua planilha, selecione o campo correspondente no sistema.
              </p>

              <div className="space-y-2">
                {parsed.headers.map(h => (
                  <div key={h} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{h}</p>
                      <p className="text-xs text-gray-400 truncate">
                        Ex: {parsed.rows[0]?.[parsed.headers.indexOf(h)] || '—'}
                      </p>
                    </div>
                    <span className="text-gray-400">→</span>
                    <select
                      value={mapeamento[h] || ''}
                      onChange={e => setMapeamento(m => ({ ...m, [h]: e.target.value || undefined }))}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-40"
                    >
                      <option value="">Ignorar coluna</option>
                      {COLUNAS_ESPERADAS.map(c => (
                        <option key={c} value={c}>{COLUNAS_LABEL[c]}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <span>ℹ️</span>
                <p className="text-xs text-amber-700">
                  <strong>Cliente</strong> e <strong>Vendedor</strong> são obrigatórios. Os demais campos são opcionais.
                </p>
              </div>
            </div>
          )}

          {/* Etapa 3: Preview */}
          {etapa === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg">
                <span>✅</span>
                <p className="text-sm text-green-700">
                  <strong>{parsed?.rows.length} cotações</strong> prontas para importar. Veja um preview abaixo (5 primeiras linhas):
                </p>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="text-xs w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.values(mapeamento).filter(Boolean).map(campo => (
                        <th key={campo} className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">
                          {COLUNAS_LABEL[campo]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {Object.entries(mapeamento)
                          .filter(([, v]) => v)
                          .map(([, campo]) => (
                            <td key={campo} className="px-3 py-2 text-gray-700 border-b border-gray-100 max-w-32 truncate">
                              {row[campo] || '—'}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed?.rows.length > 5 && (
                <p className="text-xs text-gray-400 text-center">... e mais {parsed.rows.length - 5} linhas</p>
              )}
            </div>
          )}

          {/* Importando */}
          {etapa === 'importando' && !resultado && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 animate-spin">⏳</div>
              <p className="text-gray-600 font-medium">Importando cotações...</p>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div className="text-center py-10">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Importação concluída!</h3>
              <p className="text-gray-600">
                <strong className="text-green-600 text-xl">{resultado.importadas}</strong> cotações foram importadas com sucesso.
              </p>
              <button
                onClick={onConcluida}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Ver Funil de Vendas
              </button>
            </div>
          )}
        </div>

        {/* Footer com botões de navegação */}
        {!resultado && etapa !== 'importando' && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => {
                if (etapa === 'upload') onFechar()
                if (etapa === 'mapear') setEtapa('upload')
                if (etapa === 'preview') setEtapa('mapear')
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {etapa === 'upload' ? 'Cancelar' : '← Voltar'}
            </button>

            {etapa === 'mapear' && (
              <button
                onClick={handleConfirmarMapeamento}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Próximo →
              </button>
            )}

            {etapa === 'preview' && (
              <button
                onClick={handleImportar}
                disabled={importando}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                ✓ Importar {parsed?.rows.length} cotações
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
