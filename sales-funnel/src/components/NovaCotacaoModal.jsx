import { useState } from 'react'
import { API } from '../constants.js'

export default function NovaCotacaoModal({ onFechar, onCriada }) {
  const [form, setForm] = useState({
    numero: '',
    numero_vendedor: '',
    comprador: '',
    vendedor: '',
    estado: '',
    cidade: '',
    produto: '',
    frete: '',
    lista_preco: '',
    quantidade_total: '',
    valor_total: '',
    data_cotacao: new Date().toISOString().split('T')[0],
    observacoes: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const res = await fetch(`${API}/cotacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lista_preco: parseFloat(form.lista_preco) || null,
          frete: parseFloat(form.frete) || null,
          quantidade_total: parseInt(form.quantidade_total) || null,
          valor_total: parseFloat(form.valor_total) || null,
          vendedor: form.vendedor || form.numero_vendedor,
        }),
      })
      if (!res.ok) throw new Error('Erro ao criar cotação')
      onCriada()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">+ Nova Cotação</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto scrollbar-thin">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠️ {erro}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº Cotação</label>
              <input value={form.numero} onChange={set('numero')} placeholder="001/2025"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input type="date" value={form.data_cotacao} onChange={set('data_cotacao')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comprador / Cliente <span className="text-red-500">*</span></label>
            <input value={form.comprador} onChange={set('comprador')} required placeholder="Nome ou razão social"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NºVendedor <span className="text-red-500">*</span></label>
              <input value={form.numero_vendedor} onChange={set('numero_vendedor')} required placeholder="Código"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Vendedor</label>
              <input value={form.vendedor} onChange={set('vendedor')} placeholder="Opcional"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input value={form.estado} onChange={set('estado')} placeholder="SP"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input value={form.cidade} onChange={set('cidade')} placeholder="São Paulo"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produtos</label>
            <input value={form.produto} onChange={set('produto')} placeholder="Descrição dos produtos"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total</label>
              <input type="number" step="0.01" value={form.valor_total} onChange={set('valor_total')} placeholder="0,00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Preço</label>
              <input type="number" step="0.01" value={form.lista_preco} onChange={set('lista_preco')} placeholder="0,00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frete</label>
              <input type="number" step="0.01" value={form.frete} onChange={set('frete')} placeholder="0,00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qtde Total</label>
              <input type="number" value={form.quantidade_total} onChange={set('quantidade_total')} placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={set('observacoes')} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onFechar}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {salvando ? 'Criando...' : '+ Criar Cotação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
