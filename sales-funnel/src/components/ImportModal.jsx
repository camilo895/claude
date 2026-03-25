import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { API } from '../constants.js'

const COLUNAS_ESPERADAS = [
  'numero', 'numero_vendedor', 'comprador', 'vendedor',
  'estado', 'cidade', 'produto', 'frete', 'lista_preco',
  'quantidade_total', 'valor_total', 'data_cotacao', 'status', 'observacoes'
]

const COLUNAS_LABEL = {
  numero:           'Nº Cotação',
  numero_vendedor:  'NºVendedor',
  comprador:        'Comprador / Cliente',
  vendedor:         'Vendedor (nome)',
  estado:           'Estado do comprador',
  cidade:           'Cidade do comprador',
  produto:          'Produtos',
  frete:            'Frete',
  lista_preco:      'Lista de Preço',
  quantidade_total: 'Quantidade Total',
  valor_total:      'Valor Total',
  data_cotacao:     'Data',
  status:           'Status',
  observacoes:      'Observações',
}

function normalize(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '')
}

function autoMapear(headers) {
  const aliases = {
    numero:           ['numerocotacao','cotacao','pedido','numero','cod','id','nro'],
    numero_vendedor:  ['nrovendedor','numvendedor','codigovendedor','codvendedor','vendedornr','nvendedor','nrvendedor','numvend','codvend','numerovendedor'],
    comprador:        ['comprador','cliente','razaosocial','empresa','nomecomprador'],
    vendedor:         ['vendedor','representante','consultor','agente','responsavel','nomvendedor','nomevendedor'],
    estado:           ['estado','uf','estadocomprador','estadocliente'],
    cidade:           ['cidade','municipio','cidadecomprador','cidadecliente'],
    produto:          ['produto','produtos','servico','item','descricao','material'],
    frete:            ['frete','freight'],
    lista_preco:      ['listapreco','listaprecos','tabelapreco'],
    quantidade_total: ['quantidadetotal','qtde','qtd','quantidade','qty'],
    valor_total:      ['total','valortotal','valorpedido','valorvenda','valor','vlrtotal','vltotal'],
    data_cotacao:     ['data','datacotacao','datapedido','emissao','dataemissao'],
    status:           ['status','situacao','etapa','fase'],
    observacoes:      ['observacao','obs','nota','anotacao','comentario','observacoes'],
  }

  const map = {}
  const usados = new Set()

  for (const header of headers) {
    const norm = normalize(header)
    for (const [campo, als] of Object.entries(aliases)) {
      if (usados.has(campo)) continue
      if (als.some(a => norm === a || norm.includes(a) || a.includes(norm))) {
        map[header] = campo
        usados.add(campo)
        break
      }
    }
  }
  return map
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  const firstLine = lines[0]
  const delimiter = [';', ',', '\t', '|'].reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best, ';')

  const parseRow = (line) => {
    const result = []
    let inQuote = false, current = ''
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === delimiter && !inQuote) { result.push(current.trim()); current = '' }
      else { current += ch }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).filter(l => l.trim()).map(parseRow)
  return { headers, rows }
}

function parseXLS(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (data.length < 2) return { headers: [], rows: [] }

  const headers = data[0].map(h => String(h).trim())
  const rows = data.slice(1)
    .filter(r => r.some(cell => cell !== ''))
    .map(r => headers.map((_, i) => {
      const val = r[i]
      if (val instanceof Date) {
        return val.toISOString().split('T')[0]
      }
      return val === null || val === undefined ? '' : String(val).trim()
    }))

  return { headers, rows }
}

export default function ImportModal({ onFechar, onConcluida }) {
  const [etapa, setEtapa] = useState('upload')
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

    if (['xls', 'xlsx'].includes(ext)) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const { headers, rows } = parseXLS(new Uint8Array(e.target.result))
          if (!headers.length) { setErro('Arquivo vazio ou formato inválido'); return }
          setParsed({ headers, rows, fileName: file.name })
          setMapeamento(autoMapear(headers))
          setEtapa('mapear')
          setErro(null)
        } catch (err) {
          setErro('Erro ao processar XLS: ' + err.message)
        }
      }
      reader.readAsArrayBuffer(file)
    } else if (['csv', 'txt'].includes(ext)) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const { headers, rows } = parseCSV(e.target.result)
          if (!headers.length) { setErro('Arquivo vazio ou formato inválido'); return }
          setParsed({ headers, rows, fileName: file.name })
          setMapeamento(autoMapear(headers))
          setEtapa('mapear')
          setErro(null)
        } catch (err) {
          setErro('Erro ao processar: ' + err.message)
        }
      }
      reader.readAsText(file, 'UTF-8')
    } else {
      setErro('Formato não suportado. Envie um arquivo .xls, .xlsx, .csv ou .txt')
    }
  }

  const handleFile = (e) => processarArquivo(e.target.files[0])
  const handleDrop = (e) => { e.preventDefault(); setArrastando(false); processarArquivo(e.dataTransfer.files[0]) }

  const handleConfirmarMapeamento = () => {
    const campos = Object.values(mapeamento)
    if (!campos.includes('comprador') && !campos.some(c => ['comprador','vendedor'].includes(c))) {
      setErro('O campo Comprador é obrigatório no mapeamento')
      return
    }
    if (!campos.includes('vendedor') && !campos.includes('numero_vendedor')) {
      setErro('Mapeie o campo Vendedor ou NºVendedor')
      return
    }

    const rows = parsed.rows.slice(0, 5).map(row => {
      const obj = {}
      parsed.headers.forEach((h, i) => { if (mapeamento[h]) obj[mapeamento[h]] = row[i] })
      return obj
    })
    setPreview(rows)
    setEtapa('preview')
    setErro(null)
  }

  const handleImportar = async () => {
    setImportando(true)
    setEtapa('importando')
    try {
      const cotacoes = parsed.rows.map(row => {
        const obj = {}
        parsed.headers.forEach((h, i) => { if (mapeamento[h]) obj[mapeamento[h]] = row[i] || '' })
        if (!obj.vendedor && obj.numero_vendedor) obj.vendedor = obj.numero_vendedor
        return obj
      })

      const res = await fetch(`${API}/cotacoes/importar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotacoes }),
      })
      if (!res.ok) throw new Error('Erro ao importar')
      setResultado(await res.json())
    } catch (e) {
      setErro(e.message)
      setEtapa('preview')
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📂 Importar Planilha</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {etapa === 'upload'    && 'Selecione seu arquivo XLS, XLSX ou CSV'}
              {etapa === 'mapear'   && `${parsed?.fileName} — ${parsed?.rows.length} linhas detectadas`}
              {etapa === 'preview'  && 'Confirme antes de importar'}
              {etapa === 'importando' && 'Importando...'}
            </p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Barra de progresso */}
        <div className="px-6 py-3 flex items-center gap-2 border-b border-gray-100 bg-gray-50">
          {['upload','mapear','preview'].map((e_, i) => (
            <div key={e_} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                etapa === e_ ? 'bg-blue-600 text-white' :
                ['mapear','preview','importando'].indexOf(etapa) > i ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {['mapear','preview','importando'].indexOf(etapa) > i ? '✓' : i + 1}
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
              <button onClick={() => setErro(null)}>✕</button>
            </div>
          )}

          {/* Etapa 1 — Upload */}
          {etapa === 'upload' && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                  ${arrastando ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setArrastando(true) }}
                onDragLeave={() => setArrastando(false)}
                onDrop={handleDrop}
              >
                <p className="text-5xl mb-3">{arrastando ? '📥' : '📊'}</p>
                <p className="font-semibold text-gray-700">
                  {arrastando ? 'Solte aqui' : 'Clique ou arraste seu arquivo'}
                </p>
                <p className="text-sm text-gray-400 mt-1">Formatos aceitos: .xls, .xlsx, .csv, .txt</p>
                <input ref={inputRef} type="file" accept=".xls,.xlsx,.csv,.txt" onChange={handleFile} className="hidden" />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-700">
                <p className="font-semibold mb-2">📋 Colunas detectadas automaticamente da sua planilha:</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    ['Data', 'data_cotacao'],
                    ['NºVendedor', 'numero_vendedor / vendedor'],
                    ['Comprador', 'comprador'],
                    ['Estado do comprador', 'estado'],
                    ['Cidade do comprador', 'cidade'],
                    ['Produtos', 'produto'],
                    ['Frete', 'frete'],
                    ['Lista de preço', 'lista_preco'],
                    ['Total / Valor Total', 'valor_total'],
                    ['Status', 'status (auto-convertido)'],
                    ['QuantidadeTotal', 'quantidade_total'],
                  ].map(([col, campo]) => (
                    <div key={col} className="flex gap-1">
                      <span className="font-medium">{col}</span>
                      <span className="text-blue-400">→</span>
                      <span>{campo}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Etapa 2 — Mapeamento */}
          {etapa === 'mapear' && parsed && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                <strong>{parsed.rows.length} linhas</strong> | <strong>{parsed.headers.length} colunas</strong>.
                Verifique o mapeamento automático e ajuste se necessário.
              </p>

              {parsed.headers.map(h => (
                <div key={h} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{h}</p>
                    <p className="text-xs text-gray-400 truncate">
                      Ex: {parsed.rows[0]?.[parsed.headers.indexOf(h)] || '—'}
                    </p>
                  </div>
                  <span className="text-gray-400 text-lg">→</span>
                  <select
                    value={mapeamento[h] || ''}
                    onChange={e => setMapeamento(m => ({ ...m, [h]: e.target.value || undefined }))}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-48"
                  >
                    <option value="">Ignorar coluna</option>
                    {COLUNAS_ESPERADAS.map(c => (
                      <option key={c} value={c}>{COLUNAS_LABEL[c]}</option>
                    ))}
                  </select>
                  {mapeamento[h] && (
                    <span className="text-green-500 text-lg">✓</span>
                  )}
                </div>
              ))}

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
                ℹ️ <strong>Comprador</strong> e <strong>NºVendedor</strong> (ou Vendedor) são obrigatórios.
                O campo <strong>Status</strong> é convertido automaticamente para as etapas do funil.
              </div>
            </div>
          )}

          {/* Etapa 3 — Preview */}
          {etapa === 'preview' && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
                ✅ <strong>{parsed?.rows.length} cotações</strong> prontas. Preview das 5 primeiras:
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="text-xs w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.entries(mapeamento).filter(([,v]) => v).map(([h]) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {Object.entries(mapeamento).filter(([,v]) => v).map(([, campo]) => (
                          <td key={campo} className="px-3 py-2 text-gray-700 border-b border-gray-100 max-w-28 truncate">
                            {row[campo] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed?.rows.length > 5 && (
                <p className="text-xs text-gray-400 text-center">+ {parsed.rows.length - 5} linhas adicionais</p>
              )}
            </div>
          )}

          {/* Importando */}
          {etapa === 'importando' && !resultado && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 animate-spin">⏳</div>
              <p className="text-gray-600 font-medium">Importando {parsed?.rows.length} cotações...</p>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div className="text-center py-10">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Importação concluída!</h3>
              <p className="text-gray-600">
                <strong className="text-green-600 text-2xl">{resultado.importadas}</strong> cotações importadas com sucesso.
              </p>
              <button onClick={onConcluida}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Ver Funil de Vendas →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!resultado && etapa !== 'importando' && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => {
                if (etapa === 'upload')   onFechar()
                if (etapa === 'mapear')  setEtapa('upload')
                if (etapa === 'preview') setEtapa('mapear')
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              {etapa === 'upload' ? 'Cancelar' : '← Voltar'}
            </button>

            {etapa === 'mapear' && (
              <button onClick={handleConfirmarMapeamento}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Ver Preview →
              </button>
            )}
            {etapa === 'preview' && (
              <button onClick={handleImportar}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                ✓ Importar {parsed?.rows.length} cotações
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
