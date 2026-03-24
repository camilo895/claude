import { useState, useEffect, useCallback } from 'react'
import KanbanBoard from './components/KanbanBoard.jsx'
import QuoteModal from './components/QuoteModal.jsx'
import ImportModal from './components/ImportModal.jsx'
import NovaCotacaoModal from './components/NovaCotacaoModal.jsx'
import { API } from './constants.js'

export default function App() {
  const [cotacoes, setCotacoes] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [cotacaoSelecionada, setCotacaoSelecionada] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [showNova, setShowNova] = useState(false)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const carregarCotacoes = useCallback(async () => {
    try {
      const url = filtroVendedor
        ? `${API}/cotacoes?vendedor=${encodeURIComponent(filtroVendedor)}`
        : `${API}/cotacoes`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Erro ao carregar cotações')
      const data = await res.json()
      setCotacoes(data)
      setErro(null)
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [filtroVendedor])

  const carregarVendedores = useCallback(async () => {
    try {
      const res = await fetch(`${API}/vendedores`)
      if (res.ok) setVendedores(await res.json())
    } catch (_) {}
  }, [])

  useEffect(() => {
    carregarCotacoes()
    carregarVendedores()
  }, [carregarCotacoes, carregarVendedores])

  const handleStatusChange = useCallback(async (id, novoStatus) => {
    try {
      const res = await fetch(`${API}/cotacoes/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar status')
      const atualizada = await res.json()
      setCotacoes(prev => prev.map(c => c.id === id ? atualizada : c))
    } catch (e) {
      setErro(e.message)
    }
  }, [])

  const handleAbrirCotacao = useCallback((cotacao) => {
    setCotacaoSelecionada(cotacao)
  }, [])

  const handleFecharModal = useCallback(() => {
    setCotacaoSelecionada(null)
  }, [])

  const handleCotacaoAtualizada = useCallback((cotacaoAtualizada) => {
    setCotacoes(prev => prev.map(c => c.id === cotacaoAtualizada.id ? cotacaoAtualizada : c))
    setCotacaoSelecionada(cotacaoAtualizada)
    carregarVendedores()
  }, [carregarVendedores])

  const handleCotacaoDeletada = useCallback((id) => {
    setCotacoes(prev => prev.filter(c => c.id !== id))
    setCotacaoSelecionada(null)
    carregarVendedores()
  }, [carregarVendedores])

  const handleImportConcluida = useCallback(() => {
    setShowImport(false)
    carregarCotacoes()
    carregarVendedores()
  }, [carregarCotacoes, carregarVendedores])

  const handleNovaCriada = useCallback(() => {
    setShowNova(false)
    carregarCotacoes()
    carregarVendedores()
  }, [carregarCotacoes, carregarVendedores])

  // Métricas rápidas
  const totalValor = cotacoes
    .filter(c => c.status !== 'perdido')
    .reduce((sum, c) => sum + (c.valor || 0), 0)
  const totalGanho = cotacoes
    .filter(c => c.status === 'ganho')
    .reduce((sum, c) => sum + (c.valor || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">F</div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Funil de Vendas</h1>
            <p className="text-xs text-gray-500">{cotacoes.length} cotações</p>
          </div>
        </div>

        {/* Métricas */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">Pipeline</p>
            <p className="text-sm font-bold text-gray-800">
              {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Ganho</p>
            <p className="text-sm font-bold text-green-600">
              {totalGanho.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Filtro + Ações */}
        <div className="flex items-center gap-3">
          <select
            value={filtroVendedor}
            onChange={e => setFiltroVendedor(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os vendedores</option>
            {vendedores.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors font-medium"
          >
            <span>📂</span> Importar Planilha
          </button>

          <button
            onClick={() => setShowNova(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <span>+</span> Nova Cotação
          </button>
        </div>
      </header>

      {/* Erro */}
      {erro && (
        <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
          <span>⚠️ {erro}</span>
          <button onClick={() => setErro(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Board */}
      <main className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-3">⏳</div>
              <p className="text-gray-500">Carregando cotações...</p>
            </div>
          </div>
        ) : (
          <KanbanBoard
            cotacoes={cotacoes}
            onStatusChange={handleStatusChange}
            onAbrirCotacao={handleAbrirCotacao}
          />
        )}
      </main>

      {/* Modais */}
      {cotacaoSelecionada && (
        <QuoteModal
          cotacao={cotacaoSelecionada}
          onFechar={handleFecharModal}
          onAtualizada={handleCotacaoAtualizada}
          onDeletada={handleCotacaoDeletada}
        />
      )}

      {showImport && (
        <ImportModal
          onFechar={() => setShowImport(false)}
          onConcluida={handleImportConcluida}
        />
      )}

      {showNova && (
        <NovaCotacaoModal
          onFechar={() => setShowNova(false)}
          onCriada={handleNovaCriada}
        />
      )}
    </div>
  )
}
