'use client'

import { useState, useMemo } from 'react'
import { Denuncia } from '@/types'
import { calcularRanking } from '@/lib/setores'

interface PainelSetoresProps {
  denuncias: Denuncia[]
}

const STATUS_LABEL = {
  tranquilo: 'Tranquilo',
  atencao: 'Atenção',
  critico: 'Crítico',
}

export default function PainelSetores({ denuncias }: PainelSetoresProps) {
  const [aberto, setAberto] = useState(false)
  const ranking = useMemo(() => calcularRanking(denuncias), [denuncias])

  return (
    <div className="absolute bottom-20 left-4 z-[500]">
      <button
        onClick={() => setAberto(!aberto)}
        className="bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <span className="text-lg">📊</span>
        <span className="text-xs font-semibold text-gray-700">Setores</span>
      </button>

      {aberto && (
        <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-xl w-64 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">Ranking da Orla</h3>
            <p className="text-[10px] text-gray-400">Setores por número de denúncias</p>
          </div>
          <div className="divide-y divide-gray-50">
            {ranking.map((item, i) => (
              <div key={item.setor.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-sm font-bold text-gray-400 w-4">{i + 1}</span>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.cor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {item.setor.nome}
                  </p>
                  <p className="text-[10px]" style={{ color: item.cor }}>
                    {STATUS_LABEL[item.status]}
                  </p>
                </div>
                <span className="text-sm font-bold" style={{ color: item.cor }}>
                  {item.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
