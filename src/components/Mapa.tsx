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
import HeatmapLayer from './HeatmapLayer'
import PainelSetores from './PainelSetores'
import TimelineFeed from './TimelineFeed'
import { ToastProvider, useToastNotificacao } from './ToastNotificacao'
import { getSocket } from '@/lib/socket'

const CENTRO_PRAIA_MORRO: L.LatLngExpression = [-20.6478, -40.4928]
const ZOOM_INICIAL = 16
const EXPIRACAO_MS = 10 * 60 * 1000
const EXPIRACAO_LONGA_MS = 12 * 60 * 60 * 1000
const TIPOS_EXPIRACAO_LONGA: string[] = ['LIXO', 'OUTROS']

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
  const expiracao = TIPOS_EXPIRACAO_LONGA.includes(tipo) ? EXPIRACAO_LONGA_MS : EXPIRACAO_MS
  const diff = expiracao - (Date.now() - new Date(criadoEm).getTime())
  if (diff <= 0) return 'Expirando...'
  const horas = Math.floor(diff / 3600000)
  const min = Math.floor((diff % 3600000) / 60000)
  const seg = Math.floor((diff % 60000) / 1000)
  if (horas > 0) return `${horas}h${min.toString().padStart(2, '0')}m`
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

  const centralizar = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 18),
      () => alert('Não foi possível obter sua localização'),
      { enableHighAccuracy: true }
    )
  }, [map])

  useEffect(() => {
    const control = new L.Control({ position: 'topright' })
    control.onAdd = () => {
      const btn = L.DomUtil.create('button', 'leaflet-bar')
      btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
      </svg>`
      btn.style.cssText = 'width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:white;cursor:pointer;border-radius:8px;margin-top:48px;'
      btn.title = 'Minha localização'
      btn.onclick = (e) => {
        e.stopPropagation()
        centralizar()
      }
      return btn
    }
    control.addTo(map)
    return () => { control.remove() }
  }, [map, centralizar])

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
          >Remover denúncia</button>` : ''}
        </div>
      `)

      cluster.addLayer(marker)
    })

    map.addLayer(cluster)
    return () => { map.removeLayer(cluster) }
  }, [denuncias, map])

  // Expor funções globais para os botões nos popups
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__removerDenuncia__ = (id: string) => onRemover(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__confirmarDenuncia__ = (id: string) => onConfirmar(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__verFoto__ = (id: string) => {
      window.dispatchEvent(new CustomEvent('praia10-ver-foto', { detail: id }))
    }
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__removerDenuncia__
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__confirmarDenuncia__
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__verFoto__
    }
  }, [onRemover, onConfirmar])

  return null
}

export default function Mapa() {
  const [denuncias, setDenuncias] = useState<Denuncia[]>([])
  const [formAberto, setFormAberto] = useState(false)
  const [pontoClicado, setPontoClicado] = useState<{ lat: number; lng: number } | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [mostrarHeatmap, setMostrarHeatmap] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [ultimaDenuncia, setUltimaDenuncia] = useState<Denuncia | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [carregandoFoto, setCarregandoFoto] = useState(false)

  // Toast de notificações
  useToastNotificacao(ultimaDenuncia)

  // Registrar visita única (analytics)
  useEffect(() => {
    registrarVisita()
  }, [])

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

    return () => {
      socket.off('nova-denuncia')
      socket.off('denuncia-removida')
      socket.off('denuncia-confirmada')
      socket.off('denuncia-resolvida')
    }
  }, [])

  // Timer local para remover denúncias expiradas
  useEffect(() => {
    const interval = setInterval(() => {
      setDenuncias((prev) => {
        const agora = Date.now()
        return prev.filter((d) => {
          const expiracao = TIPOS_EXPIRACAO_LONGA.includes(d.tipo) ? EXPIRACAO_LONGA_MS : EXPIRACAO_MS
          return agora - new Date(d.criadoEm).getTime() < expiracao
        })
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Listener para abrir foto via evento custom (popup do Leaflet)
  useEffect(() => {
    const handler = async (e: Event) => {
      const id = (e as CustomEvent).detail
      setCarregandoFoto(true)
      try {
        const res = await fetch(`/api/denuncias?fotoId=${id}`)
        const data = await res.json()
        if (data.fotoBase64) setFotoUrl(data.fotoBase64)
      } catch (err) {
        console.error('Erro ao carregar foto:', err)
      } finally {
        setCarregandoFoto(false)
      }
    }
    window.addEventListener('praia10-ver-foto', handler)
    return () => window.removeEventListener('praia10-ver-foto', handler)
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
        setDenuncias((prev) => prev.filter((d) => d.id !== id))
      }
    } catch (error) {
      console.error('Erro ao remover denúncia:', error)
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
      console.error('Erro ao confirmar denúncia:', error)
    }
  }, [])

  const handleClose = () => {
    setFormAberto(false)
    setPontoClicado(null)
  }

  const handleFlyTo = useCallback((lat: number, lng: number) => {
    setFlyToTarget({ lat, lng })
  }, [])

  return (
    <div className="relative w-full h-full">
      <ToastProvider />

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
        {!mostrarHeatmap && (
          <MarkerClusterGroup
            denuncias={denuncias}
            onRemover={handleRemover}
            onConfirmar={handleConfirmar}
          />
        )}
        <HeatmapLayer denuncias={denuncias} visivel={mostrarHeatmap} />
        <UserLocation />
        <BotaoLocalizacao />
        <FlyToHandler target={flyToTarget} />
      </MapContainer>

      {/* Toggle heatmap */}
      <div className="absolute top-4 right-4 z-[500]">
        <button
          onClick={() => setMostrarHeatmap(!mostrarHeatmap)}
          className={`rounded-lg shadow-lg px-3 py-2 text-xs font-semibold transition-colors ${
            mostrarHeatmap
              ? 'bg-orange-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          🔥 {mostrarHeatmap ? 'Marcadores' : 'Heatmap'}
        </button>
      </div>

      {/* Timeline */}
      <TimelineFeed denuncias={denuncias} onFlyTo={handleFlyTo} />

      {/* Setores */}
      <PainelSetores denuncias={denuncias} />

      {/* Instrução */}
      {!formAberto && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur rounded-full shadow-md px-5 py-2.5 pointer-events-none">
          <span className="text-xs font-semibold text-gray-500">
            Toque e denuncie
          </span>
        </div>
      )}

      {/* Formulário */}
      {formAberto && pontoClicado && (
        <FormDenuncia
          latitude={pontoClicado.lat}
          longitude={pontoClicado.lng}
          onSubmit={handleSubmit}
          onClose={handleClose}
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
                alt="Foto da denúncia"
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
