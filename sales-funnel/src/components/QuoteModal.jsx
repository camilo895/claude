import { useState, useEffect } from 'react'
import { STAGES, FOLLOWUP_TIPOS, formatCurrency, formatDate, formatDateTime, API } from '../constants.js'

export default function QuoteModal({ cotacao, onFechar, onAtualizada, onDeletada }) {
  const [detalhe, setDetalhe] = useState(null)
  const [aba, setAba] = useState('historico')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const nome = cotacao.comprador || cotacao.cliente || '—'
  const vendedorLabel = cotacao.numero_vendedor
    ? `${cotacao.numero_vendedor}${cotacao.vendedor && cotacao.vendedor !== cotacao.numero_vendedor ? ` · ${cotacao.vendedor}` : ''}`
    : cotacao.vendedor

  // Form follow-up
  const [fTipo, setFTipo] = useState('ligacao')
  const [fDescricao, setFDescricao] = useState('')
  const [fResultado, setFResultado] = useState('')
  const [fVendedor, setFVendedor] = useState(cotacao.vendedor || cotacao.numero_vendedor || '')

  // Form resposta cliente
  const [rResposta, setRResposta] = useState('')

  // Editar cotação
  const [editForm, setEditForm] = useState({
    numero:           cotacao.numero || '',
    numero_vendedor:  cotacao.numero_vendedor || '',
    comprador:        cotacao.comprador || cotacao.cliente || '',
    vendedor:         cotacao.vendedor || '',
    estado:           cotacao.estado || '',
    cidade:           cotacao.cidade || '',
    produto:          cotacao.produto || '',
    frete:            cotacao.frete || '',
    lista_preco:      cotacao.lista_preco || cotacao.valor || '',
    quantidade_total: cotacao.quantidade_total || '',
    data_cotacao:     cotacao.data_cotacao || '',
    observacoes:      cotacao.observacoes || '',
  })

  useEffect(() => { carregarDetalhe() }, [cotacao.id])

  const carregarDetalhe = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/cotacoes/${cotacao.id}`)
      if (!res.ok) throw new Error('Erro ao carregar detalhes')
      setDetalhe(await res.json())
      setErro(null)
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFollowup = async (e) => {
    e.preventDefault()
    if (!fDescricao.trim()) return
    setSalvando(true)
    try {
      const res = await fetch(`${API}/cotacoes/${cotacao.id}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: fTipo, descricao: fDescricao, resultado: fResultado, vendedor: fVendedor }),
      })
      if (!res.ok) throw new Error('Erro ao salvar follow-up')
      setFDescricao(''); setFResultado('')
      await carregarDetalhe()
      setAba('historico')
    } catch (e) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  const handleAddResposta = async (e) => {
    e.preventDefault()
    if (!rResposta.trim()) return
    setSalvando(true)
    try {
      const res = await fetch(`${API}/cotacoes/${cotacao.id}/respostas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resposta: rResposta }),
      })
      if (!res.ok) throw new Error('Erro ao salvar resposta')
      setRResposta('')
      await carregarDetalhe()
      setAba('historico')
    } catch (e) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  const handleSalvarEdicao = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const res = await fetch(`${API}/cotacoes/${cotacao.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          lista_preco: parseFloat(editForm.lista_preco) || null,
          frete: parseFloat(editForm.frete) || null,
          quantidade_total: parseInt(editForm.quantidade_total) || null,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      onAtualizada(await res.json())
    } catch (e) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  const handleStatusChange = async (novoStatus) => {
    try {
      const res = await fetch(`${API}/cotacoes/${cotacao.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar status')
      onAtualizada(await res.json())
    } catch (e) { setErro(e.message) }
  }

  const handleDeletar = async () => {
    if (!confirm(`Excluir cotação de ${nome}?`)) return
    try {
      const res = await fetch(`${API}/cotacoes/${cotacao.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      onDeletada(cotacao.id)
    } catch (e) { setErro(e.message) }
  }

  const stage = STAGES.find(s => s.id === cotacao.status) || STAGES[0]

  const historico = detalhe
    ? [
        ...detalhe.followups.map(f => ({ ...f, _tipo: 'followup', _data: f.data_followup })),
        ...detalhe.respostas.map(r => ({ ...r, _tipo: 'resposta', _data: r.data_resposta })),
      ].sort((a, b) => new Date(b._data) - new Date(a._data))
    : []

  const set = (field) => (e) => setEditForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100" style={{ borderTop: `4px solid ${stage.color}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {cotacao.numero && <p className="text-xs font-mono text-gray-400">#{cotacao.numero}</p>}
              <h2 className="text-xl font-bold text-gray-900 truncate">{nome}</h2>
              <div className="flex items-center gap-3 flex-wrap mt-0.5">
                <p className="text-sm text-gray-500">👤 {vendedorLabel}</p>
                {(cotacao.cidade || cotacao.estado) && (
                  <p className="text-sm text-gray-400">📍 {[cotacao.cidade, cotacao.estado].filter(Boolean).join(' / ')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{stage.icon}</span>
              <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl p-1">✕</button>
            </div>
          </div>

          {/* Métricas rápidas */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {(cotacao.lista_preco || cotacao.valor) && (
              <div className="text-center">
                <p className="text-xs text-gray-400">Lista de Preço</p>
                <p className="font-bold" style={{ color: stage.color }}>
                  {formatCurrency(cotacao.lista_preco || cotacao.valor)}
                </p>
              </div>
            )}
            {cotacao.frete && (
              <div className="text-center">
                <p className="text-xs text-gray-400">Frete</p>
                <p className="font-semibold text-gray-700">{formatCurrency(cotacao.frete)}</p>
              </div>
            )}
            {cotacao.quantidade_total && (
              <div className="text-center">
                <p className="text-xs text-gray-400">Qtde</p>
                <p className="font-semibold text-gray-700">{cotacao.quantidade_total}</p>
              </div>
            )}
            {cotacao.produto && (
              <div>
                <p className="text-xs text-gray-400">Produto</p>
                <p className="text-sm text-gray-700 truncate max-w-48">{cotacao.produto}</p>
              </div>
            )}
            {cotacao.data_cotacao && (
              <div className="text-center">
                <p className="text-xs text-gray-400">Data</p>
                <p className="text-sm text-gray-700">{formatDate(cotacao.data_cotacao)}</p>
              </div>
            )}
          </div>

          {/* Status selector */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {STAGES.map(s => (
              <button key={s.id} onClick={() => handleStatusChange(s.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                  ${cotacao.status === s.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={cotacao.status === s.id ? { backgroundColor: s.color } : {}}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
          {[
            { id: 'historico', label: `📋 Histórico ${historico.length > 0 ? `(${historico.length})` : ''}` },
            { id: 'followup',  label: '📞 Follow-up' },
            { id: 'resposta',  label: '💬 Resp. Cliente' },
            { id: 'editar',    label: '✏️ Editar' },
          ].map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${aba === a.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
              <span>⚠️ {erro}</span>
              <button onClick={() => setErro(null)}>✕</button>
            </div>
          )}

          {/* Histórico */}
          {aba === 'historico' && (
            loading ? (
              <p className="text-gray-400 text-center py-8">Carregando...</p>
            ) : historico.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-5xl mb-3">📭</p>
                <p className="text-gray-400 font-medium">Nenhum registro ainda</p>
                <p className="text-gray-400 text-sm mt-1">Registre um follow-up ou resposta do cliente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historico.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                        style={{
                          backgroundColor: item._tipo === 'followup' ? '#EFF6FF' : '#F0FDF4',
                          border: `2px solid ${item._tipo === 'followup' ? '#3B82F6' : '#10B981'}`,
                        }}>
                        {item._tipo === 'followup'
                          ? FOLLOWUP_TIPOS.find(t => t.id === item.tipo)?.icon || '📝'
                          : '💬'}
                      </div>
                      {i < historico.length - 1 && <div className="w-0.5 flex-1 mt-1 bg-gray-200" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item._tipo === 'followup' ? (
                              <>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                  {FOLLOWUP_TIPOS.find(t => t.id === item.tipo)?.label || item.tipo}
                                </span>
                                <span className="text-xs text-gray-500">{item.vendedor}</span>
                              </>
                            ) : (
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                Resposta do Cliente
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">{formatDateTime(item._data)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          {item._tipo === 'followup' ? item.descricao : item.resposta}
                        </p>
                        {item._tipo === 'followup' && item.resultado && (
                          <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                            <span className="font-medium">Resultado:</span> {item.resultado}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Follow-up */}
          {aba === 'followup' && (
            <form onSubmit={handleAddFollowup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Contato</label>
                <div className="grid grid-cols-3 gap-2">
                  {FOLLOWUP_TIPOS.map(t => (
                    <button key={t.id} type="button" onClick={() => setFTipo(t.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
                        ${fTipo === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">O que foi feito? <span className="text-red-500">*</span></label>
                <textarea value={fDescricao} onChange={e => setFDescricao(e.target.value)} required rows={3}
                  placeholder="Descreva o que foi feito no contato..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resultado / Próximo passo</label>
                <textarea value={fResultado} onChange={e => setFResultado(e.target.value)} rows={2}
                  placeholder="Qual foi o resultado? O que ficou combinado?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
                <input value={fVendedor} onChange={e => setFVendedor(e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <button type="submit" disabled={salvando || !fDescricao.trim()}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {salvando ? 'Salvando...' : '📞 Registrar Follow-up'}
              </button>
            </form>
          )}

          {/* Resposta do Cliente */}
          {aba === 'resposta' && (
            <form onSubmit={handleAddResposta} className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                <p className="text-sm text-green-700 font-medium">💬 Qual foi o retorno do cliente?</p>
                <p className="text-xs text-green-600 mt-1">Registre o que o comprador respondeu, sua posição sobre a proposta, objeções ou próximos passos.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resposta do cliente <span className="text-red-500">*</span></label>
                <textarea value={rResposta} onChange={e => setRResposta(e.target.value)} required rows={5}
                  placeholder="Ex: Comprador pediu prazo de entrega menor. Vai consultar a diretoria e retorna até sexta..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" />
              </div>
              <button type="submit" disabled={salvando || !rResposta.trim()}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {salvando ? 'Salvando...' : '💬 Registrar Resposta'}
              </button>
            </form>
          )}

          {/* Editar */}
          {aba === 'editar' && (
            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nº Cotação</label>
                  <input value={editForm.numero} onChange={set('numero')} placeholder="001/2025"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" value={editForm.data_cotacao} onChange={set('data_cotacao')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comprador / Cliente <span className="text-red-500">*</span></label>
                <input value={editForm.comprador} onChange={set('comprador')} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NºVendedor</label>
                  <input value={editForm.numero_vendedor} onChange={set('numero_vendedor')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Vendedor</label>
                  <input value={editForm.vendedor} onChange={set('vendedor')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <input value={editForm.estado} onChange={set('estado')} placeholder="SP"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input value={editForm.cidade} onChange={set('cidade')} placeholder="São Paulo"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produtos</label>
                <input value={editForm.produto} onChange={set('produto')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Preço</label>
                  <input type="number" step="0.01" value={editForm.lista_preco} onChange={set('lista_preco')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frete</label>
                  <input type="number" step="0.01" value={editForm.frete} onChange={set('frete')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qtde Total</label>
                  <input type="number" value={editForm.quantidade_total} onChange={set('quantidade_total')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={editForm.observacoes} onChange={set('observacoes')} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={salvando}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {salvando ? 'Salvando...' : '✔ Salvar Alterações'}
                </button>
                <button type="button" onClick={handleDeletar}
                  className="px-4 py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 border border-red-200 transition-colors">
                  🗑 Excluir
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
