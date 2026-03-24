export const STAGES = [
  { id: 'novo',       label: 'Novo Lead',         color: '#6B7280', bg: '#F3F4F6', icon: '🆕' },
  { id: 'contato',    label: 'Contato Inicial',   color: '#3B82F6', bg: '#EFF6FF', icon: '📞' },
  { id: 'proposta',   label: 'Proposta Enviada',  color: '#F59E0B', bg: '#FFFBEB', icon: '📄' },
  { id: 'negociacao', label: 'Negociação',        color: '#8B5CF6', bg: '#F5F3FF', icon: '🤝' },
  { id: 'ganho',      label: 'Ganho',             color: '#10B981', bg: '#ECFDF5', icon: '✅' },
  { id: 'perdido',    label: 'Perdido',           color: '#EF4444', bg: '#FEF2F2', icon: '❌' },
]

export const FOLLOWUP_TIPOS = [
  { id: 'ligacao',  label: 'Ligação',    icon: '📞' },
  { id: 'whatsapp', label: 'WhatsApp',   icon: '💬' },
  { id: 'email',    label: 'E-mail',     icon: '📧' },
  { id: 'visita',   label: 'Visita',     icon: '🚗' },
  { id: 'reuniao',  label: 'Reunião',    icon: '🗓️' },
  { id: 'outro',    label: 'Outro',      icon: '📝' },
]

export function formatCurrency(value) {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export const API = '/api'
