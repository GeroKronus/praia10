'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'

import { Denuncia, NovaDenuncia, TipoDenuncia, TIPO_CONFIG, POI, TipoPOI, POI_CONFIG } from '@/types'
import { criarIcone } from './IconeDenuncia'
import { criarIconePOI } from './IconePOI'
import FormDenuncia from './FormDenuncia'
import HeatmapLayer from './HeatmapLayer'
import PainelSetores from './PainelSetores'
import TimelineFeed from './TimelineFeed'
import FeedPOIs from './FeedPOIs'
import PhotoModal from './PhotoModal'
import { ToastProvider, useToastNotificacao } from './ToastNotificacao'
import { getSocket } from '@/lib/socket'
import { EXPIRACAO_CURTA_MS, EXPIRACAO_LONGA_MS, TIPOS_EXPIRACAO_LONGA, CENTRO_PRAIA_MORRO } from '@/lib/constants'
import { useFotoModal } from '@/hooks/useFotoModal'
import { useWindowFunction } from '@/hooks/useWindowFunction'

const ZOOM_INICIAL = 16

function getSessionId(): string {
  let id = sessionStorage.getItem('praia10_session')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('praia10_session', id)
  }
  return id
}

function getVisitorId(): string {
  let id = localStorage.getItem('praia10_visitor')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('praia10_visitor', id)
  }
  return id
}

function registrarVisita() {
  const visitorId = getVisitorId()
  fetch('/api/visita', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId }),
  }).catch(() => {}) // fire-and-forget
}

function tempoRestante(criadoEm: string, tipo: string): string {
  const expiracao = TIPOS_EXPIRACAO_LONGA.includes(tipo) ? EXPIRACAO_LONGA_MS : EXPIRACAO_CURTA_MS
  const diff = expiracao - (Date.now() - new Date(criadoEm).getTime())
  if (diff <= 0) return 'Expirando...'
  const horas = Math.floor(diff / 3600000)
  const min = Math.floor((diff % 3600000) / 60000)
  const seg = Math.floor((diff % 60000) / 1000)
  if (horas > 0) return `${horas}h${min.toString().padStart(2, '0')}m`
  return `${min}:${seg.toString().padStart(2, '0')}`
}

// Componente de localizacao do usuario
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
      (err) => console.log('Geolocalizacao indisponivel:', err.message),
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

// Botao para centralizar na localizacao do usuario (renderizado fora do mapa)
function BotaoLocalizacao({ onCentralizar }: { onCentralizar: () => void }) {
  return (
    <button
      onClick={onCentralizar}
      className="absolute top-16 right-3 z-[500] w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-lg cursor-pointer"
      title="Minha localizacao"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
      </svg>
    </button>
  )
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

// Componente FlyTo imperativo
function FlyToHandler({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 18)
  }, [target, map])
  return null
}

// Componente para MarkerCluster
function MarkerClusterGroup({
  denuncias,
  onRemover,
  onConfirmar,
}: {
  denuncias: Denuncia[]
  onRemover: (id: string) => void
  onConfirmar: (id: string) => void
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
      const resolvido = !!d.resolvidoEm
      const marker = L.marker([d.latitude, d.longitude], {
        icon: criarIcone(d.tipo as TipoDenuncia, d.confirmacoes, resolvido),
      })

      const config = TIPO_CONFIG[d.tipo as TipoDenuncia]
      const data = new Date(d.criadoEm).toLocaleString('pt-BR')
      const ehMinha = d.sessionId === sessionId.current
      const tempo = tempoRestante(d.criadoEm, d.tipo)

      const resolvidoHtml = resolvido
        ? `<div style="
            margin-top: 6px;
            padding: 4px 8px;
            background: #27ae60;
            color: white;
            border-radius: 6px;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
          ">&#10003; Resolvido${d.resolvidoPor ? ` por ${d.resolvidoPor}` : ''}</div>`
        : ''

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">
            ${config.emoji} ${config.label}
          </div>
          ${d.descricao ? `<p style="font-size: 12px; color: #555; margin: 4px 0;">${d.descricao}</p>` : ''}
          ${d.temFoto ? `<button
            onclick="window.__verFoto__('${d.id}')"
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
          ${!resolvido ? `<p style="font-size: 11px; color: #e67e22; margin-top: 2px;">⏱️ Expira em ${tempo}</p>` : ''}
          ${d.confirmacoes > 0 ? `<p style="font-size: 11px; color: #3b82f6; margin-top: 2px; font-weight: bold;">👥 ${d.confirmacoes} confirmação${d.confirmacoes > 1 ? 'ões' : ''}</p>` : ''}
          ${resolvidoHtml}
          ${!resolvido && !ehMinha ? `<button
            onclick="window.__confirmarDenuncia__('${d.id}')"
            style="
              margin-top: 8px;
              width: 100%;
              padding: 6px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: bold;
              cursor: pointer;
            "
          >👍 Eu também!</button>` : ''}
          ${!resolvido && ehMinha ? `<button
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
          >Remover denuncia</button>` : ''}
        </div>
      `)

      cluster.addLayer(marker)
    })

    map.addLayer(cluster)
    return () => { map.removeLayer(cluster) }
  }, [denuncias, map])

  // Expor funcoes globais para os botoes nos popups
  useWindowFunction('__removerDenuncia__', onRemover)
  useWindowFunction('__confirmarDenuncia__', onConfirmar)

  // __verFoto__ is handled by useFotoModal in the parent component

  return null
}

// Componente para POIs no mapa publico
function POIMarkersPublic({ pois }: { pois: POI[] }) {
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
        <div style="min-width: 160px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 2px;">
            ${config.emoji} ${poi.nome || config.label}
          </div>
          ${poi.descricao ? `<p style="font-size: 12px; color: #555; margin: 4px 0;">${poi.descricao}</p>` : ''}
          ${poi.temFoto ? `<button
            onclick="window.__verFotoPOI__('${poi.id}')"
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
          <p style="font-size: 11px; color: ${config.cor}; font-weight: 600;">${config.label}</p>
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

  // __verFotoPOI__ is handled by useFotoModal in the parent component

  return null
}

const FOTO_ENDPOINTS = [
  { windowName: '__verFoto__', eventName: 'praia10-ver-foto', apiUrl: '/api/denuncias' },
  { windowName: '__verFotoPOI__', eventName: 'praia10-ver-foto-poi', apiUrl: '/api/pois' },
]

export default function Mapa() {
  const [denuncias, setDenuncias] = useState<Denuncia[]>([])
  const [pois, setPois] = useState<POI[]>([])
  const [formAberto, setFormAberto] = useState(false)
  const [pontoClicado, setPontoClicado] = useState<{ lat: number; lng: number } | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [mostrarHeatmap, setMostrarHeatmap] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [ultimaDenuncia, setUltimaDenuncia] = useState<Denuncia | null>(null)
  const [painelAberto, setPainelAberto] = useState<'utilidades' | 'feed' | 'setores' | null>(null)

  const { fotoUrl, carregandoFoto, fecharFoto } = useFotoModal(FOTO_ENDPOINTS)

  const togglePainel = useCallback((painel: 'utilidades' | 'feed' | 'setores') => {
    setPainelAberto((p) => (p === painel ? null : painel))
  }, [])

  // Toast de notificacoes
  useToastNotificacao(ultimaDenuncia)

  // Registrar visita unica (analytics)
  useEffect(() => {
    registrarVisita()
  }, [])

  // Buscar denuncias existentes
  useEffect(() => {
    fetch('/api/denuncias')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDenuncias(data)
      })
      .catch(console.error)
      .finally(() => setCarregando(false))
  }, [])

  // Buscar POIs
  useEffect(() => {
    fetch('/api/pois')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPois(data)
      })
      .catch(console.error)
  }, [])

  // Conectar Socket.io para tempo real
  useEffect(() => {
    const socket = getSocket()

    socket.on('nova-denuncia', (denuncia: Denuncia) => {
      setDenuncias((prev) => {
        if (prev.some((d) => d.id === denuncia.id)) return prev
        return [denuncia, ...prev]
      })
      setUltimaDenuncia(denuncia)
    })

    socket.on('denuncia-removida', ({ id }: { id: string }) => {
      setDenuncias((prev) => prev.filter((d) => d.id !== id))
    })

    socket.on('denuncia-confirmada', ({ id, confirmacoes }: { id: string; confirmacoes: number }) => {
      setDenuncias((prev) =>
        prev.map((d) => (d.id === id ? { ...d, confirmacoes } : d))
      )
    })

    socket.on('denuncia-resolvida', ({ id, resolvidoEm, resolvidoPor }: { id: string; resolvidoEm: string; resolvidoPor: string }) => {
      setDenuncias((prev) =>
        prev.map((d) => (d.id === id ? { ...d, resolvidoEm, resolvidoPor } : d))
      )
    })

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
      socket.off('nova-denuncia')
      socket.off('denuncia-removida')
      socket.off('denuncia-confirmada')
      socket.off('denuncia-resolvida')
      socket.off('novo-poi')
      socket.off('poi-removido')
    }
  }, [])

  // Timer local para remover denuncias expiradas
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
    setPainelAberto(null)
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
      console.error('Erro ao enviar denuncia:', error)
      alert('Erro ao enviar denuncia. Tente novamente.')
    }
  }

  const handleRemover = useCallback(async (id: string) => {
    const sessionId = getSessionId()
    try {
      const res = await fetch(`/api/denuncias?id=${id}&sessionId=${sessionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDenuncias((prev) => prev.filter((d) => d.id !== id))
      }
    } catch (error) {
      console.error('Erro ao remover denuncia:', error)
    }
  }, [])

  const handleConfirmar = useCallback(async (id: string) => {
    const sessionId = getSessionId()
    try {
      const res = await fetch('/api/denuncias/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ denunciaId: id, sessionId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao confirmar')
      }
    } catch (error) {
      console.error('Erro ao confirmar denuncia:', error)
    }
  }, [])

  const handleClose = () => {
    setFormAberto(false)
    setPontoClicado(null)
  }

  const handleFlyTo = useCallback((lat: number, lng: number) => {
    setFlyToTarget({ lat, lng })
  }, [])

  const centro: L.LatLngExpression = [CENTRO_PRAIA_MORRO[0], CENTRO_PRAIA_MORRO[1]]

  return (
    <div className="relative w-full h-full">
      <ToastProvider />

      {carregando && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-white/80">
          <div className="text-lg font-semibold text-gray-600">Carregando mapa...</div>
        </div>
      )}

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
        {!mostrarHeatmap && (
          <MarkerClusterGroup
            denuncias={denuncias}
            onRemover={handleRemover}
            onConfirmar={handleConfirmar}
          />
        )}
        <HeatmapLayer denuncias={denuncias} visivel={mostrarHeatmap} />
        <POIMarkersPublic pois={pois} />
        <UserLocation />
        <FlyToHandler target={flyToTarget} />
      </MapContainer>

      {/* Botao localizacao */}
      <BotaoLocalizacao onCentralizar={() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => setFlyToTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => alert('Nao foi possivel obter sua localizacao'),
          { enableHighAccuracy: true }
        )
      }} />

      {/* Overlay para fechar painel ao clicar fora */}
      {painelAberto && (
        <div className="fixed inset-0 z-[499]" onClick={() => setPainelAberto(null)} />
      )}

      {/* Toolbar unificada */}
      <div className="absolute top-3 left-3 right-3 z-[500] pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-1 gap-0.5 pointer-events-auto">
            <button
              onClick={() => togglePainel('utilidades')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                painelAberto === 'utilidades' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>📍</span>
              <span>Util</span>
              {pois.length > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {pois.length}
                </span>
              )}
            </button>
            <button
              onClick={() => togglePainel('feed')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                painelAberto === 'feed' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>📋</span>
              <span>Feed</span>
              {denuncias.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {denuncias.length}
                </span>
              )}
            </button>
            <button
              onClick={() => togglePainel('setores')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                painelAberto === 'setores' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>📊</span>
              <span>Setores</span>
            </button>
          </div>

          <button
            onClick={() => setMostrarHeatmap(!mostrarHeatmap)}
            className={`ml-auto rounded-xl shadow-lg px-2.5 py-2 text-xs font-semibold transition-colors pointer-events-auto ${
              mostrarHeatmap
                ? 'bg-orange-500 text-white'
                : 'bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white'
            }`}
          >
            🔥
          </button>
        </div>

        {/* Painel aberto */}
        {painelAberto && (
          <div className="mt-2 pointer-events-auto">
            {painelAberto === 'utilidades' && (
              <FeedPOIs pois={pois} onFlyTo={handleFlyTo} onClose={() => setPainelAberto(null)} />
            )}
            {painelAberto === 'feed' && (
              <TimelineFeed denuncias={denuncias} onFlyTo={handleFlyTo} onClose={() => setPainelAberto(null)} />
            )}
            {painelAberto === 'setores' && (
              <PainelSetores denuncias={denuncias} />
            )}
          </div>
        )}
      </div>

      {/* Instrucao */}
      {!formAberto && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur rounded-full shadow-md px-5 py-2.5 pointer-events-none">
          <span className="text-xs font-semibold text-gray-500">
            Toque e denuncie
          </span>
        </div>
      )}

      {/* Formulario */}
      {formAberto && pontoClicado && (
        <FormDenuncia
          latitude={pontoClicado.lat}
          longitude={pontoClicado.lng}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      )}

      {/* Modal de foto */}
      <PhotoModal fotoUrl={fotoUrl} carregando={carregandoFoto} onClose={fecharFoto} />
    </div>
  )
}
