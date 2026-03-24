import { formatCurrency, formatDate } from '../constants.js'

export default function QuoteCard({ cotacao, stageColor, onClick, onDragStart, onDragEnd }) {
  const diasSemAtividade = cotacao.updated_at
    ? Math.floor((Date.now() - new Date(cotacao.updated_at)) / 86400000)
    : null

  const alertaSemAtividade = diasSemAtividade !== null && diasSemAtividade >= 3
    && cotacao.status !== 'ganho' && cotacao.status !== 'perdido'

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
      {/* Número e Cliente */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {cotacao.numero && (
            <p className="text-xs font-mono text-gray-400 mb-0.5">#{cotacao.numero}</p>
          )}
          <p className="font-semibold text-gray-800 text-sm leading-tight truncate">
            {cotacao.cliente}
          </p>
        </div>
        {alertaSemAtividade && (
          <span title={`${diasSemAtividade} dias sem atividade`} className="text-orange-400 text-sm flex-shrink-0">⚠️</span>
        )}
      </div>

      {/* Produto */}
      {cotacao.produto && (
        <p className="text-xs text-gray-500 truncate mb-2">{cotacao.produto}</p>
      )}

      {/* Valor */}
      {cotacao.valor && (
        <p className="text-sm font-bold mb-2" style={{ color: stageColor }}>
          {formatCurrency(cotacao.valor)}
        </p>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: stageColor }}
          >
            {cotacao.vendedor?.charAt(0)?.toUpperCase()}
          </div>
          <span className="text-xs text-gray-500 truncate max-w-24">{cotacao.vendedor}</span>
        </div>
        {cotacao.data_cotacao && (
          <span className="text-xs text-gray-400">{formatDate(cotacao.data_cotacao)}</span>
        )}
      </div>

      {/* Indicador de hover */}
      <div
        className="h-0.5 w-0 group-hover:w-full mt-2 rounded-full transition-all duration-200"
        style={{ backgroundColor: stageColor }}
      />
    </div>
  )
}
