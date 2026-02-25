'use client'

import { POI, TipoPOI, POI_CONFIG } from '@/types'

interface FeedPOIsProps {
  pois: POI[]
  onFlyTo: (lat: number, lng: number) => void
  onClose: () => void
}

export default function FeedPOIs({ pois, onFlyTo, onClose }: FeedPOIsProps) {
  return (
    <div className="bg-white rounded-xl shadow-xl w-72 max-h-80 overflow-hidden flex flex-col">
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
                  onClose()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
              >
                <span className="text-xl flex-shrink-0">{config.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700">
                    {poi.nome || config.label}
                  </p>
                  {poi.descricao ? (
                    <p className="text-[10px] text-gray-400 truncate">{poi.descricao}</p>
                  ) : poi.temFoto ? (
                    <p className="text-[10px] text-gray-400">📷 Com foto</p>
                  ) : null}
                </div>
                <span className="text-[10px] text-gray-300 flex-shrink-0">{config.label}</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
