import { formatCurrency, formatDate } from '../constants.js'

export default function QuoteCard({ cotacao, stageColor, onClick, onDragStart, onDragEnd }) {
  const diasSemAtividade = cotacao.updated_at
    ? Math.floor((Date.now() - new Date(cotacao.updated_at)) / 86400000)
    : null

  const alerta = diasSemAtividade !== null && diasSemAtividade >= 3
    && cotacao.status !== 'ganho' && cotacao.status !== 'perdido'

  const nome = cotacao.comprador || cotacao.cliente || '—'
  const local = [cotacao.cidade, cotacao.estado].filter(Boolean).join(' / ')
  const valor = cotacao.valor_total || cotacao.lista_preco || cotacao.valor

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, cotacao.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="
        bg-white rounded-lg p-3 shadow-sm border border-gray-100
        cursor-pointer hover:shadow-md hover:-translate-y-0.5
        transition-all duration-150 select-none group
      "
    >
      {/* Nº cotação e alerta */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          {cotacao.numero && (
            <p className="text-xs font-mono text-gray-400">#{cotacao.numero}</p>
          )}
          <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{nome}</p>
        </div>
        {alerta && (
          <span title={`${diasSemAtividade} dias sem atividade`} className="text-orange-400 text-sm flex-shrink-0">⚠️</span>
        )}
      </div>

      {/* Produto */}
      {cotacao.produto && (
        <p className="text-xs text-gray-500 truncate mb-1.5">{cotacao.produto}</p>
      )}

      {/* Cidade/Estado */}
      {local && (
        <p className="text-xs text-gray-400 truncate mb-1.5">📍 {local}</p>
      )}

      {/* Valor */}
      {valor && (
        <p className="text-sm font-bold mb-2" style={{ color: stageColor }}>
          {formatCurrency(valor)}
        </p>
      )}

      {/* Qtde + Frete */}
      <div className="flex items-center gap-3 mb-2">
        {cotacao.quantidade_total && (
          <span className="text-xs text-gray-500">Qtde: <strong>{cotacao.quantidade_total}</strong></span>
        )}
        {cotacao.frete && (
          <span className="text-xs text-gray-500">Frete: <strong>{formatCurrency(cotacao.frete)}</strong></span>
        )}
      </div>

      {/* Rodapé: Vendedor + Data */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: stageColor }}
          >
            {(cotacao.vendedor || cotacao.numero_vendedor)?.charAt(0)?.toUpperCase()}
          </div>
          <span className="text-xs text-gray-500 truncate max-w-28">
            {cotacao.numero_vendedor
              ? `${cotacao.numero_vendedor}${cotacao.vendedor && cotacao.vendedor !== cotacao.numero_vendedor ? ` · ${cotacao.vendedor}` : ''}`
              : cotacao.vendedor}
          </span>
        </div>
        {cotacao.data_cotacao && (
          <span className="text-xs text-gray-400">{formatDate(cotacao.data_cotacao)}</span>
        )}
      </div>

      <div className="h-0.5 w-0 group-hover:w-full mt-2 rounded-full transition-all duration-200"
        style={{ backgroundColor: stageColor }} />
    </div>
  )
}
