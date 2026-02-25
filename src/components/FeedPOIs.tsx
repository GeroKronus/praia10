'use client'

import { useState } from 'react'
import { POI, TipoPOI, POI_CONFIG } from '@/types'

interface FeedPOIsProps {
  pois: POI[]
  onFlyTo: (lat: number, lng: number) => void
}

export default function FeedPOIs({ pois, onFlyTo }: FeedPOIsProps) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="absolute top-14 left-20 z-[500]">
      <button
        onClick={() => setAberto(!aberto)}
        className="bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <span className="text-lg">📍</span>
        <span className="text-xs font-semibold text-gray-700">Utilidades</span>
        {pois.length > 0 && (
          <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {pois.length}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute top-12 left-0 bg-white rounded-xl shadow-xl w-72 max-h-80 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <h3 className="text-sm font-bold text-gray-800">Pontos de Utilidade</h3>
            <p className="text-[10px] text-gray-400">Toque para localizar no mapa</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {pois.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Nenhum ponto cadastrado
              </div>
            ) : (
              pois.map((poi) => {
                const config = POI_CONFIG[poi.tipo as TipoPOI]
                return (
                  <button
                    key={poi.id}
                    onClick={() => {
                      onFlyTo(poi.latitude, poi.longitude)
                      setAberto(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
                  >
                    <span className="text-xl flex-shrink-0">{config.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        {poi.nome || config.label}
                      </p>
                      {poi.descricao && (
                        <p className="text-[10px] text-gray-400 truncate">{poi.descricao}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-300 flex-shrink-0">{config.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
