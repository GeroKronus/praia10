'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { POI, TipoPOI, POI_CONFIG, Denuncia, TipoDenuncia, TIPO_CONFIG } from '@/types'
import { criarIconePOI } from '@/components/IconePOI'
import { criarIcone } from '@/components/IconeDenuncia'
import FormPOI from '@/components/admin/FormPOI'
import PhotoModal from '@/components/PhotoModal'
import { getSocket } from '@/lib/socket'
import { CENTRO_PRAIA_MORRO, EXPIRACAO_CURTA_MS, EXPIRACAO_LONGA_MS, TIPOS_EXPIRACAO_LONGA } from '@/lib/constants'
import { useFotoModal } from '@/hooks/useFotoModal'
import { useWindowFunction } from '@/hooks/useWindowFunction'

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

  useWindowFunction('__excluirPOI__', onExcluir)

  // __verFotoPOIAdmin__ is handled by useFotoModal in the parent component

  return null
}

function DenunciaMarkersAdmin({ denuncias, onExcluir }: { denuncias: Denuncia[]; onExcluir: (id: string) => void }) {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    denuncias.forEach((d) => {
      const resolvido = !!d.resolvidoEm
      const config = TIPO_CONFIG[d.tipo as TipoDenuncia]
      const data = new Date(d.criadoEm).toLocaleString('pt-BR')

      const marker = L.marker([d.latitude, d.longitude], {
        icon: criarIcone(d.tipo as TipoDenuncia, d.confirmacoes, resolvido),
      })

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">
            ${config.emoji} ${config.label}
          </div>
          ${d.descricao ? `<p style="font-size: 12px; color: #555; margin: 4px 0;">${d.descricao}</p>` : ''}
          ${d.temFoto ? `<button
            onclick="window.__verFotoDenAdmin__('${d.id}')"
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
          <p style="font-size: 11px; color: #999; margin-top: 6px;">📅 ${data}</p>
          ${d.confirmacoes > 0 ? `<p style="font-size: 11px; color: #3b82f6; margin-top: 2px; font-weight: bold;">👥 ${d.confirmacoes} confirmação${d.confirmacoes > 1 ? 'ões' : ''}</p>` : ''}
          ${resolvido ? `<div style="
            margin-top: 6px;
            padding: 4px 8px;
            background: #27ae60;
            color: white;
            border-radius: 6px;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
          ">&#10003; Resolvido${d.resolvidoPor ? ` por ${d.resolvidoPor}` : ''}</div>` : ''}
          <button
            onclick="window.__excluirDenunciaAdmin__('${d.id}')"
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
          >Excluir denúncia</button>
        </div>
      `)

      marker.addTo(map)
      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
    }
  }, [denuncias, map])

  useWindowFunction('__excluirDenunciaAdmin__', onExcluir)

  return null
}

const FOTO_ENDPOINTS_ADMIN = [
  { windowName: '__verFotoPOIAdmin__', eventName: 'praia10-ver-foto-poi-admin', apiUrl: '/api/pois' },
  { windowName: '__verFotoDenAdmin__', eventName: 'praia10-ver-foto-den-admin', apiUrl: '/api/denuncias' },
]

export default function AdminMapa({ senha }: { senha: string }) {
  const [pois, setPois] = useState<POI[]>([])
  const [denuncias, setDenuncias] = useState<Denuncia[]>([])
  const [formAberto, setFormAberto] = useState(false)
  const [pontoClicado, setPontoClicado] = useState<{ lat: number; lng: number } | null>(null)

  const { fotoUrl, carregandoFoto, fecharFoto } = useFotoModal(FOTO_ENDPOINTS_ADMIN)

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

  // Buscar denúncias
  useEffect(() => {
    fetch('/api/denuncias')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDenuncias(data)
      })
      .catch(console.error)
  }, [])

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

    socket.on('nova-denuncia', (denuncia: Denuncia) => {
      setDenuncias((prev) => {
        if (prev.some((d) => d.id === denuncia.id)) return prev
        return [denuncia, ...prev]
      })
    })

    socket.on('denuncia-removida', ({ id }: { id: string }) => {
      setDenuncias((prev) => prev.filter((d) => d.id !== id))
    })

    socket.on('denuncia-resolvida', ({ id, resolvidoEm, resolvidoPor }: { id: string; resolvidoEm: string; resolvidoPor: string }) => {
      setDenuncias((prev) =>
        prev.map((d) => (d.id === id ? { ...d, resolvidoEm, resolvidoPor } : d))
      )
    })

    return () => {
      socket.off('novo-poi')
      socket.off('poi-removido')
      socket.off('nova-denuncia')
      socket.off('denuncia-removida')
      socket.off('denuncia-resolvida')
    }
  }, [])

  // Auto-expiração de denúncias
  useEffect(() => {
    const interval = setInterval(() => {
      setDenuncias((prev) => {
        const agora = Date.now()
        return prev.filter((d) => {
          const expiracao = TIPOS_EXPIRACAO_LONGA.includes(d.tipo) ? EXPIRACAO_LONGA_MS : EXPIRACAO_CURTA_MS
          return agora - new Date(d.criadoEm).getTime() < expiracao
        })
      })
    }, 10000)
    return () => clearInterval(interval)
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

  const handleExcluirDenuncia = useCallback(async (id: string) => {
    if (!confirm('Excluir esta denúncia?')) return
    try {
      const res = await fetch(`/api/denuncias?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': senha },
      })
      if (res.ok) {
        setDenuncias((prev) => prev.filter((d) => d.id !== id))
      }
    } catch (err) {
      console.error('Erro ao excluir denúncia:', err)
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

  const centro: L.LatLngExpression = [CENTRO_PRAIA_MORRO[0], CENTRO_PRAIA_MORRO[1]]

  return (
    <div className="relative w-screen h-screen">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[500] bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <h1 className="text-sm font-bold text-gray-800">Admin Mapa</h1>
          <span className="text-xs text-gray-500">({pois.length} POIs, {denuncias.length} denúncias)</span>
        </div>
        <a href="/" className="text-xs text-blue-600 hover:underline">Voltar ao mapa</a>
      </div>

      <MapContainer
        center={centro}
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
        <DenunciaMarkersAdmin denuncias={denuncias} onExcluir={handleExcluirDenuncia} />
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
      <PhotoModal fotoUrl={fotoUrl} carregando={carregandoFoto} onClose={fecharFoto} />
    </div>
  )
}
