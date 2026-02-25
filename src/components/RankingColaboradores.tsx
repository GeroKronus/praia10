'use client'

import { useEffect, useState } from 'react'

interface RankingItem {
  visitorId: string
  avatar: string
  titulo: string
  denuncias: number
  confirmacoes: number
  total: number
}

const MEDALHAS = ['🥇', '🥈', '🥉']

export default function RankingColaboradores({ onClose }: { onClose: () => void }) {
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [meuVisitorId, setMeuVisitorId] = useState<string | null>(null)

  useEffect(() => {
    setMeuVisitorId(localStorage.getItem('praia10_visitor'))
    fetch('/api/ranking')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRanking(data)
      })
      .catch(console.error)
      .finally(() => setCarregando(false))
  }, [])

  const minhaPosicao = meuVisitorId
    ? ranking.findIndex((r) => r.visitorId === meuVisitorId)
    : -1

  return (
    <div className="bg-white rounded-xl shadow-xl w-72 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Top Colaboradores</h3>
          <p className="text-[10px] text-gray-400">Quem mais ajuda na praia</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      {minhaPosicao >= 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 font-medium">
          Você está em {minhaPosicao + 1}º lugar! {ranking[minhaPosicao].avatar}
        </div>
      )}

      {carregando ? (
        <div className="p-4 text-center text-sm text-gray-400">Carregando...</div>
      ) : ranking.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-400">Nenhum colaborador ainda</div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {ranking.map((item, i) => {
            const ehEu = item.visitorId === meuVisitorId
            const idCurto = item.visitorId.substring(0, 4).toUpperCase()
            return (
              <div
                key={item.visitorId}
                className={`flex items-center gap-2.5 px-4 py-2.5 ${ehEu ? 'bg-blue-50' : ''}`}
              >
                <span className="text-sm font-bold text-gray-400 w-5 text-center">
                  {i < 3 ? MEDALHAS[i] : i + 1}
                </span>
                <span className="text-lg">{item.avatar}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {ehEu ? 'Você' : `Colaborador #${idCurto}`}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {item.titulo} · {item.denuncias}d · {item.confirmacoes}c
                  </p>
                </div>
                <span className="text-sm font-bold text-blue-600">{item.total}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
