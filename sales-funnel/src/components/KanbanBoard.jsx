import { useRef, useState } from 'react'
import { STAGES, formatCurrency } from '../constants.js'
import QuoteCard from './QuoteCard.jsx'

export default function KanbanBoard({ cotacoes, onStatusChange, onAbrirCotacao }) {
  const [dragOver, setDragOver] = useState(null)
  const dragId = useRef(null)

  const cotacoesPorStage = (stageId) =>
    cotacoes.filter(c => c.status === stageId)

  const totalPorStage = (stageId) =>
    cotacoesPorStage(stageId).reduce((sum, c) => sum + (c.valor || 0), 0)

  const handleDragStart = (e, id) => {
    dragId.current = id
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.classList.add('dragging')
  }

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging')
    dragId.current = null
    setDragOver(null)
  }

  const handleDragOver = (e, stageId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(stageId)
  }

  const handleDragLeave = () => {
    setDragOver(null)
  }

  const handleDrop = (e, stageId) => {
    e.preventDefault()
    setDragOver(null)
    if (dragId.current != null) {
      onStatusChange(dragId.current, stageId)
    }
  }

  return (
    <div className="flex gap-4 p-4 h-full overflow-x-auto pb-4 items-start">
      {STAGES.map(stage => {
        const cards = cotacoesPorStage(stage.id)
        const total = totalPorStage(stage.id)
        const isOver = dragOver === stage.id

        return (
          <div
            key={stage.id}
            className={`
              flex flex-col flex-shrink-0 w-72 rounded-xl transition-all duration-150
              ${isOver ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
            `}
            style={{ backgroundColor: stage.bg }}
            onDragOver={e => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, stage.id)}
          >
            {/* Cabeçalho da coluna */}
            <div
              className="px-4 py-3 rounded-t-xl flex items-center justify-between"
              style={{ borderBottom: `3px solid ${stage.color}` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{stage.icon}</span>
                <div>
                  <h3 className="font-bold text-sm text-gray-800">{stage.label}</h3>
                  {total > 0 && (
                    <p className="text-xs font-medium" style={{ color: stage.color }}>
                      {formatCurrency(total)}
                    </p>
                  )}
                </div>
              </div>
              <span
                className="text-xs font-bold px-2 py-1 rounded-full text-white"
                style={{ backgroundColor: stage.color }}
              >
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div
              className={`
                flex flex-col gap-3 p-3 min-h-32 overflow-y-auto scrollbar-thin
                ${isOver ? 'bg-blue-50/50' : ''}
                transition-colors duration-150
              `}
              style={{ maxHeight: 'calc(100vh - 180px)' }}
            >
              {cards.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-gray-300 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                  Arraste aqui
                </div>
              ) : (
                cards.map(cotacao => (
                  <QuoteCard
                    key={cotacao.id}
                    cotacao={cotacao}
                    stageColor={stage.color}
                    onClick={() => onAbrirCotacao(cotacao)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
