'use client'

import { useState, useEffect, useRef } from 'react'
import { Denuncia, TipoDenuncia, TIPO_CONFIG } from '@/types'

interface TimelineFeedProps {
  denuncias: Denuncia[]
  onFlyTo: (lat: number, lng: number) => void
}

function tempoRelativo(criadoEm: string): string {
  const diff = Date.now() - new Date(criadoEm).getTime()
  const seg = Math.floor(diff / 1000)
  if (seg < 60) return 'agora'
  const min = Math.floor(seg / 60)
  return `${min}min atrás`
}

export default function TimelineFeed({ denuncias, onFlyTo }: TimelineFeedProps) {
  const [aberto, setAberto] = useState(false)
  const [, setTick] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Atualizar tempos relativos a cada 30s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll para o topo quando chega denúncia nova
  useEffect(() => {
    if (aberto && listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [denuncias.length, aberto])

  return (
    <div className="absolute top-16 right-4 z-[500]">
      <button
        onClick={() => setAberto(!aberto)}
        className="bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <span className="text-lg">📋</span>
        <span className="text-xs font-semibold text-gray-700">Feed</span>
        {denuncias.length > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {denuncias.length}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl w-72 max-h-80 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <h3 className="text-sm font-bold text-gray-800">Timeline ao Vivo</h3>
            <p className="text-[10px] text-gray-400">Toque para localizar no mapa</p>
          </div>
          <div ref={listRef} className="overflow-y-auto flex-1">
            {denuncias.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Nenhuma denúncia ativa
              </div>
            ) : (
              denuncias.map((d) => {
                const config = TIPO_CONFIG[d.tipo as TipoDenuncia]
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      onFlyTo(d.latitude, d.longitude)
                      setAberto(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
                  >
                    <span className="text-xl flex-shrink-0">{config.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">{config.label}</p>
                      {d.temFoto && (
                        <p className="text-[10px] text-gray-400">📷 Com foto</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-[10px] text-gray-400">{tempoRelativo(d.criadoEm)}</span>
                      {d.confirmacoes > 0 && (
                        <span className="text-[10px] text-blue-500 font-medium">
                          +{d.confirmacoes}
                        </span>
                      )}
                    </div>
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
