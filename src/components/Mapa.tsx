'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'

import { Denuncia, NovaDenuncia, TipoDenuncia, TIPO_CONFIG } from '@/types'
import { criarIcone } from './IconeDenuncia'
import FormDenuncia from './FormDenuncia'
import { getSocket } from '@/lib/socket'

const CENTRO_PRAIA_MORRO: L.LatLngExpression = [-20.6478, -40.4928]
const ZOOM_INICIAL = 16
const EXPIRACAO_MS = 5 * 60 * 1000

function getSessionId(): string {
  let id = sessionStorage.getItem('praia10_session')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('praia10_session', id)
  }
  return id
}

function tempoRestante(criadoEm: string): string {
  const diff = EXPIRACAO_MS - (Date.now() - new Date(criadoEm).getTime())
  if (diff <= 0) return 'Expirando...'
  const min = Math.floor(diff / 60000)
  const seg = Math.floor((diff % 60000) / 1000)
  return `${min}:${seg.toString().padStart(2, '0')}`
}

// Componente de localização do usuário
function UserLocation() {
  const map = useMap()
  const markerRef = useRef<L.CircleMarker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const latlng: L.LatLngExpression = [latitude, longitude]

        if (markerRef.current) {
          markerRef.current.setLatLng(latlng)
          circleRef.current?.setLatLng(latlng)
          circleRef.current?.setRadius(accuracy)
        } else {
          circleRef.current = L.circle(latlng, {
            radius: accuracy,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1,
          }).addTo(map)

          markerRef.current = L.circleMarker(latlng, {
            radius: 8,
            color: '#fff',
            fillColor: '#3b82f6',
            fillOpacity: 1,
            weight: 3,
          }).addTo(map)
        }
      },
      (err) => console.log('Geolocalização indisponível:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      markerRef.current?.remove()
      circleRef.current?.remove()
    }
  }, [map])

  return null
}

// Botão para centralizar na localização do usuário
function BotaoLocalizacao() {
  const map = useMap()

  const centralizar = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 18),
      () => alert('Não foi possível obter sua localização'),
      { enableHighAccuracy: true }
    )
  }

  useEffect(() => {
    const control = new L.Control({ position: 'bottomright' })
    control.onAdd = () => {
      const btn = L.DomUtil.create('button', 'leaflet-bar')
      btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
      </svg>`
      btn.style.cssText = 'width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:white;cursor:pointer;border-radius:8px;'
      btn.title = 'Minha localização'
      btn.onclick = (e) => {
        e.stopPropagation()
        centralizar()
      }
      return btn
    }
    control.addTo(map)
    return () => { control.remove() }
  }, [map])

  return null
}

// Componente para capturar cliques no mapa
function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Componente para MarkerCluster
function MarkerClusterGroup({
  denuncias,
  onRemover,
}: {
  denuncias: Denuncia[]
  onRemover: (id: string) => void
}) {
  const map = useMap()
  const sessionId = useRef(getSessionId())

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      iconCreateFunction: (clusterObj: any) => {
        const count = clusterObj.getChildCount()
        return L.divIcon({
          html: `<div style="
            background: #e74c3c;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">${count}</div>`,
          className: 'custom-cluster',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        })
      },
    })

    denuncias.forEach((d) => {
      const marker = L.marker([d.latitude, d.longitude], {
        icon: criarIcone(d.tipo as TipoDenuncia),
      })

      const config = TIPO_CONFIG[d.tipo as TipoDenuncia]
      const data = new Date(d.criadoEm).toLocaleString('pt-BR')
      const ehMinha = d.sessionId === sessionId.current
      const tempo = tempoRestante(d.criadoEm)

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">
            ${config.emoji} ${config.label}
          </div>
          ${d.descricao ? `<p style="font-size: 13px; color: #555; margin: 4px 0;">${d.descricao}</p>` : ''}
          <p style="font-size: 11px; color: #999; margin-top: 6px;">
            📅 ${data}
          </p>
          <p style="font-size: 11px; color: #e67e22; margin-top: 2px;">
            ⏱️ Expira em ${tempo}
          </p>
          ${ehMinha ? `<button
            onclick="window.__removerDenuncia__('${d.id}')"
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
          >Remover denúncia</button>` : ''}
        </div>
      `)

      cluster.addLayer(marker)
    })

    map.addLayer(cluster)

    return () => {
      map.removeLayer(cluster)
    }
  }, [denuncias, map])

  // Expor função global para o botão no popup
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__removerDenuncia__ = (id: string) => {
      onRemover(id)
    }
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__removerDenuncia__
    }
  }, [onRemover])

  return null
}

export default function Mapa() {
  const [denuncias, setDenuncias] = useState<Denuncia[]>([])
  const [formAberto, setFormAberto] = useState(false)
  const [pontoClicado, setPontoClicado] = useState<{ lat: number; lng: number } | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Buscar denúncias existentes
  useEffect(() => {
    fetch('/api/denuncias')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDenuncias(data)
      })
      .catch(console.error)
      .finally(() => setCarregando(false))
  }, [])

  // Conectar Socket.io para tempo real
  useEffect(() => {
    const socket = getSocket()

    socket.on('connect', () => {
      console.log('Socket.io conectado:', socket.id)
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

    return () => {
      socket.off('connect')
      socket.off('nova-denuncia')
      socket.off('denuncia-removida')
    }
  }, [])

  // Timer local para remover denúncias expiradas do estado e forçar re-render dos tempos
  useEffect(() => {
    const interval = setInterval(() => {
      setDenuncias((prev) => {
        const agora = Date.now()
        return prev.filter((d) => agora - new Date(d.criadoEm).getTime() < EXPIRACAO_MS)
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPontoClicado({ lat, lng })
    setFormAberto(true)
  }, [])

  const handleSubmit = async (novaDenuncia: NovaDenuncia) => {
    try {
      const res = await fetch('/api/denuncias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaDenuncia),
      })

      if (res.ok) {
        setFormAberto(false)
        setPontoClicado(null)
      }
    } catch (error) {
      console.error('Erro ao enviar denúncia:', error)
      alert('Erro ao enviar denúncia. Tente novamente.')
    }
  }

  const handleRemover = useCallback(async (id: string) => {
    const sessionId = getSessionId()
    try {
      const res = await fetch(`/api/denuncias?id=${id}&sessionId=${sessionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        // Remoção otimista local (socket também vai notificar)
        setDenuncias((prev) => prev.filter((d) => d.id !== id))
      }
    } catch (error) {
      console.error('Erro ao remover denúncia:', error)
    }
  }, [])

  const handleClose = () => {
    setFormAberto(false)
    setPontoClicado(null)
  }

  return (
    <div className="relative w-full h-full">
      {carregando && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-white/80">
          <div className="text-lg font-semibold text-gray-600">Carregando mapa...</div>
        </div>
      )}

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
        <MarkerClusterGroup denuncias={denuncias} onRemover={handleRemover} />
        <UserLocation />
        <BotaoLocalizacao />
      </MapContainer>

      {/* Contador de denúncias */}
      <div className="absolute top-4 right-4 z-[500] bg-white rounded-lg shadow-lg px-4 py-2">
        <span className="text-sm font-medium text-gray-600">
          {denuncias.length} denúncia{denuncias.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Instrução */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur rounded-full shadow-lg px-6 py-3 pointer-events-none">
        <span className="text-sm font-medium text-gray-600">
          Toque no mapa para fazer uma denúncia
        </span>
      </div>

      {/* Formulário */}
      {formAberto && pontoClicado && (
        <FormDenuncia
          latitude={pontoClicado.lat}
          longitude={pontoClicado.lng}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
