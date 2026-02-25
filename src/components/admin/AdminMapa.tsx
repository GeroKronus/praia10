'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { POI, TipoPOI, POI_CONFIG } from '@/types'
import { criarIconePOI } from '@/components/IconePOI'
import FormPOI from '@/components/admin/FormPOI'
import { getSocket } from '@/lib/socket'

const CENTRO_PRAIA_MORRO: L.LatLngExpression = [-20.6478, -40.4928]
const ZOOM_INICIAL = 16

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function POIMarkers({ pois, onExcluir }: { pois: POI[]; onExcluir: (id: string) => void }) {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    pois.forEach((poi) => {
      const config = POI_CONFIG[poi.tipo as TipoPOI]
      const marker = L.marker([poi.latitude, poi.longitude], {
        icon: criarIconePOI(poi.tipo as TipoPOI),
      })

      marker.bindPopup(`
        <div style="min-width: 180px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">
            ${config.emoji} ${poi.nome || config.label}
          </div>
          ${poi.descricao ? `<p style="font-size: 12px; color: #555; margin: 4px 0;">${poi.descricao}</p>` : ''}
          ${poi.temFoto ? `<button
            onclick="window.__verFotoPOIAdmin__('${poi.id}')"
            style="
              margin: 6px 0;
              padding: 4px 10px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              cursor: pointer;
            "
          >📷 Ver foto</button>` : ''}
          <p style="font-size: 11px; color: #999; margin-top: 4px;">${config.label}</p>
          <button
            onclick="window.__excluirPOI__('${poi.id}')"
            style="
              margin-top: 8px;
              width: 100%;
              padding: 6px;
              background: #e74c3c;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: bold;
              cursor: pointer;
            "
          >Excluir POI</button>
        </div>
      `)

      marker.addTo(map)
      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
    }
  }, [pois, map])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__excluirPOI__ = (id: string) => onExcluir(id)
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__excluirPOI__
    }
  }, [onExcluir])

  return null
}

export default function AdminMapa({ senha }: { senha: string }) {
  const [pois, setPois] = useState<POI[]>([])
  const [formAberto, setFormAberto] = useState(false)
  const [pontoClicado, setPontoClicado] = useState<{ lat: number; lng: number } | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [carregandoFoto, setCarregandoFoto] = useState(false)

  const buscarPois = useCallback(async () => {
    try {
      const res = await fetch('/api/pois')
      if (res.ok) {
        const data = await res.json()
        setPois(data)
      }
    } catch (err) {
      console.error('Erro ao buscar POIs:', err)
    }
  }, [])

  useEffect(() => {
    buscarPois()
  }, [buscarPois])

  useEffect(() => {
    const socket = getSocket()

    socket.on('novo-poi', (poi: POI) => {
      setPois((prev) => {
        if (prev.some((p) => p.id === poi.id)) return prev
        return [poi, ...prev]
      })
    })

    socket.on('poi-removido', ({ id }: { id: string }) => {
      setPois((prev) => prev.filter((p) => p.id !== id))
    })

    return () => {
      socket.off('novo-poi')
      socket.off('poi-removido')
    }
  }, [])

  // Listener para abrir foto de POI
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__verFotoPOIAdmin__ = (id: string) => {
      window.dispatchEvent(new CustomEvent('praia10-ver-foto-poi-admin', { detail: id }))
    }
    const handler = async (e: Event) => {
      const id = (e as CustomEvent).detail
      setCarregandoFoto(true)
      try {
        const res = await fetch(`/api/pois?fotoId=${id}`)
        const data = await res.json()
        if (data.fotoBase64) setFotoUrl(data.fotoBase64)
      } catch (err) {
        console.error('Erro ao carregar foto POI:', err)
      } finally {
        setCarregandoFoto(false)
      }
    }
    window.addEventListener('praia10-ver-foto-poi-admin', handler)
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__verFotoPOIAdmin__
      window.removeEventListener('praia10-ver-foto-poi-admin', handler)
    }
  }, [])

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPontoClicado({ lat, lng })
    setFormAberto(true)
  }, [])

  const handleExcluir = useCallback(async (id: string) => {
    if (!confirm('Excluir este POI?')) return
    try {
      const res = await fetch(`/api/pois?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': senha },
      })
      if (res.ok) {
        setPois((prev) => prev.filter((p) => p.id !== id))
      }
    } catch (err) {
      console.error('Erro ao excluir POI:', err)
    }
  }, [senha])

  const handleCriado = (poi: POI) => {
    setPois((prev) => {
      if (prev.some((p) => p.id === poi.id)) return prev
      return [poi, ...prev]
    })
    setFormAberto(false)
    setPontoClicado(null)
  }

  return (
    <div className="relative w-screen h-screen">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[500] bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <h1 className="text-sm font-bold text-gray-800">Admin POIs</h1>
          <span className="text-xs text-gray-500">({pois.length} pontos)</span>
        </div>
        <a href="/" className="text-xs text-blue-600 hover:underline">Voltar ao mapa</a>
      </div>

      <MapContainer
        center={CENTRO_PRAIA_MORRO}
        zoom={ZOOM_INICIAL}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={handleMapClick} />
        <POIMarkers pois={pois} onExcluir={handleExcluir} />
      </MapContainer>

      {!formAberto && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur rounded-full shadow-md px-5 py-2.5 pointer-events-none">
          <span className="text-xs font-semibold text-gray-500">
            Clique no mapa para criar um POI
          </span>
        </div>
      )}

      {formAberto && pontoClicado && (
        <FormPOI
          latitude={pontoClicado.lat}
          longitude={pontoClicado.lng}
          senha={senha}
          onCriado={handleCriado}
          onClose={() => { setFormAberto(false); setPontoClicado(null) }}
        />
      )}

      {/* Modal de foto */}
      {(fotoUrl || carregandoFoto) && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80"
          onClick={() => { setFotoUrl(null); setCarregandoFoto(false) }}
        >
          {carregandoFoto ? (
            <div className="text-white text-lg">Carregando foto...</div>
          ) : (
            <div className="relative max-w-[90vw] max-h-[90vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoUrl!}
                alt="Foto do POI"
                className="max-w-full max-h-[90vh] rounded-lg object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setFotoUrl(null)}
                className="absolute top-2 right-2 bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center text-xl"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
