'use client'

interface StatsCardsProps {
  totalHoje: number
  totalSemana: number
  ativasAgora: number
  resolvidasHoje: number
  visitantesHoje: number
}

const cards = [
  { key: 'totalHoje', label: 'Hoje', icon: '📅', cor: 'bg-blue-500' },
  { key: 'totalSemana', label: 'Semana', icon: '📊', cor: 'bg-purple-500' },
  { key: 'ativasAgora', label: 'Ativas', icon: '🔴', cor: 'bg-red-500' },
  { key: 'resolvidasHoje', label: 'Resolvidas', icon: '✅', cor: 'bg-green-500' },
  { key: 'visitantesHoje', label: 'Visitantes', icon: '👥', cor: 'bg-teal-500' },
] as const

export default function StatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4"
        >
          <div className={`${card.cor} text-white w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0`}>
            {card.icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{props[card.key]}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
