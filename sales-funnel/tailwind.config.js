/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        funnel: {
          novo: '#6B7280',
          contato: '#3B82F6',
          proposta: '#F59E0B',
          negociacao: '#8B5CF6',
          ganho: '#10B981',
          perdido: '#EF4444',
        }
      }
    }
  },
  plugins: [],
}
