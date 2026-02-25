'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import { Denuncia } from '@/types'

interface HeatmapLayerProps {
  denuncias: Denuncia[]
  visivel: boolean
}

export default function HeatmapLayer({ denuncias, visivel }: HeatmapLayerProps) {
  const map = useMap()

  useEffect(() => {
    if (!visivel || denuncias.length === 0) return

    const pontos: [number, number, number][] = denuncias.map((d) => [
      d.latitude,
      d.longitude,
      0.5 + Math.min(d.confirmacoes * 0.2, 0.5), // intensidade baseada em confirmações
    ])

    const heat = L.heatLayer(pontos, {
      radius: 35,
      blur: 25,
      maxZoom: 18,
      minOpacity: 0.4,
      gradient: {
        0.2: '#3b82f6',
        0.4: '#22d3ee',
        0.6: '#facc15',
        0.8: '#f97316',
        1.0: '#ef4444',
      },
    })

    heat.addTo(map)
    return () => { map.removeLayer(heat) }
  }, [map, denuncias, visivel])

  return null
}
