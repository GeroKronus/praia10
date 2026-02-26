'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Polygon, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'

import { Denuncia, NovaDenuncia, TipoDenuncia, TIPO_CONFIG, POI, TipoPOI, POI_CONFIG, AgenteOnline } from '@/types'
import { criarIcone } from './IconeDenuncia'
import { criarIconePOI } from './IconePOI'
import FormDenuncia from './FormDenuncia'
import HeatmapLayer from './HeatmapLayer'
import PainelSetores from './PainelSetores'
import TimelineFeed from './TimelineFeed'
import FeedPOIs from './FeedPOIs'
import RankingColaboradores from './RankingColaboradores'
import PushSubscriber from './PushSubscriber'
import PhotoModal from './PhotoModal'
import { ToastProvider, useToastNotificacao } from './ToastNotificacao'
import toast from 'react-hot-toast'
import { getSocket } from '@/lib/socket'
import { EXPIRACAO_CURTA_MS, EXPIRACAO_LONGA_MS, AVISO_CURTA_MS, AVISO_LONGA_MS, TIPOS_EXPIRACAO_LONGA, CENTRO_PRAIA_MORRO } from '@/lib/constants'
import { getAvatarTier } from '@/lib/avatares'
import { SETORES } from '@/lib/setores'
import { getVisitorId, reconcileVisitorId } from '@/lib/visitor'
import { useFotoModal } from '@/hooks/useFotoModal'
import { useWindowFunction } from '@/hooks/useWindowFunction'

const ZOOM_INICIAL = 16

const TILE_LIGHT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

function isNightTime(): boolean {
  const h = new Date().getHours()
  return h >= 18 || h < 6
}

function getSessionId(): string {
  let id = sessionStorage.getItem('praia10_session')
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
        })
    sessionStorage.setItem('praia10_session', id)
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

function pertoDeExpirar(criadoEm: string, tipo: string): boolean {
  const expiracao = TIPOS_EXPIRACAO_LONGA.includes(tipo) ? EXPIRACAO_LONGA_MS : EXPIRACAO_CURTA_MS
  const aviso = TIPOS_EXPIRACAO_LONGA.includes(tipo) ? AVISO_LONGA_MS : AVISO_CURTA_MS
  const restante = expiracao - (Date.now() - new Date(criadoEm).getTime())
  return restante > 0 && restante <= aviso
}

// Display de coordenadas ao mover o mouse (temporário — para mapear setores)
function CoordDisplay() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [pontos, setPontos] = useState<{ lat: number; lng: number }[]>([])
  useMapEvents({
    mousemove(e) { setCoords({ lat: e.latlng.lat, lng: e.latlng.lng }) },
    contextmenu(e) {
      e.originalEvent.preventDefault()
      setPontos((prev) => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }])
    },
  })
  return (
    <div className="absolute bottom-2 left-2 z-[1000] flex flex-col gap-1 pointer-events-none">
      {pontos.length > 0 && (
        <div className="bg-black/80 text-green-400 text-[10px] font-mono px-2 py-1 rounded max-h-40 overflow-y-auto pointer-events-auto select-all">
          {pontos.map((p, i) => (
            <div key={i}>P{i + 1}: {p.lat.toFixed(6)}, {p.lng.toFixed(6)}</div>
          ))}
          <div className="flex gap-2 mt-1">
            <button onClick={() => { navigator.clipboard.writeText(pontos.map((p, i) => `P${i + 1}: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`).join('\n')) }} className="text-blue-400 text-[9px] underline">Copiar</button>
            <button onClick={() => setPontos([])} className="text-red-400 text-[9px] underline">Limpar</button>
          </div>
        </div>
      )}
      {coords && (
        <div className="bg-black/70 text-white text-xs font-mono px-2 py-1 rounded select-all">
          {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
        </div>
      )}
    </div>
  )
}

// Componente de localizacao do usuario (marca bolinha azul + centraliza na 1a posicao)
function UserLocation() {
  const map = useMap()
  const markerRef = useRef<L.CircleMarker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const centeredRef = useRef(false)

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const latlng: L.LatLngExpression = [latitude, longitude]

        // Centralizar no usuario na primeira posicao obtida
        if (!centeredRef.current) {
          centeredRef.current = true
          map.flyTo(latlng, 17)
        }

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

interface AvatarInfo { emoji: string; titulo: string }
interface AvatarClaim { chave: string; emoji: string; titulo: string; disponivel: boolean; meu: boolean }

// Componente para MarkerCluster
function MarkerClusterGroup({
  denuncias,
  onRemover,
  onConfirmar,
  onCompartilhar,
  onRenovar,
  avatarMap,
}: {
  denuncias: Denuncia[]
  onRemover: (id: string) => void
  onConfirmar: (id: string) => void
  onCompartilhar: (id: string) => void
  onRenovar: (id: string) => void
  avatarMap: Map<string, AvatarInfo>
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

    // Fallback: contar denúncias por visitorId localmente para quem não está no ranking
    const localCounts = new Map<string, number>()
    denuncias.forEach((d) => {
      if (d.visitorId) localCounts.set(d.visitorId, (localCounts.get(d.visitorId) || 0) + 1)
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
      const expirando = pertoDeExpirar(d.criadoEm, d.tipo)
      const avatar = d.visitorId
        ? avatarMap.get(d.visitorId) || getAvatarTier(localCounts.get(d.visitorId) || 0)
        : null

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
          ${avatar ? `<div style="
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 12px;
            font-size: 11px;
            margin-bottom: 6px;
          ">${avatar.emoji} <span style="color: #0369a1; font-weight: 600;">${avatar.titulo}</span></div>` : ''}
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
          ${!resolvido && ehMinha && expirando ? `<button
            onclick="window.__renovarDenuncia__('${d.id}')"
            style="
              margin-top: 6px;
              width: 100%;
              padding: 6px;
              background: #f59e0b;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: bold;
              cursor: pointer;
            "
          >🔄 Renovar denúncia</button>` : ''}
          <button
            onclick="window.__compartilharDenuncia__('${d.id}')"
            style="
              margin-top: 6px;
              width: 100%;
              padding: 6px;
              background: #22c55e;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: bold;
              cursor: pointer;
            "
          >📤 Compartilhar</button>
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
  useWindowFunction('__compartilharDenuncia__', onCompartilhar)
  useWindowFunction('__renovarDenuncia__', onRenovar)

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

function criarIconeAgente(emoji: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      background: #1e293b;
      border: 3px solid #38bdf8;
      box-shadow: 0 0 12px rgba(56,189,248,0.5);
    ">${emoji}</div>`,
    className: 'agente-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  })
}

function popupHtmlAgente(a: AgenteOnline): string {
  return `
    <div style="text-align:center;min-width:160px">
      <div style="font-size:20px">${a.emoji} <b>${a.nome}</b></div>
      <div style="margin-top:6px">
        <input id="msg-agente-${a.id}" type="text" maxlength="200" placeholder="Enviar mensagem..."
          style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px" />
      </div>
      <button onclick="window.__enviarMsgAgente__('${a.id}')"
        style="margin-top:6px;width:100%;padding:5px 0;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">
        Enviar 💬
      </button>
    </div>`
}

function AgentesMarkers({ agentes }: { agentes: AgenteOnline[] }) {
  const map = useMap()
  const markersRef = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    const agenteIds = new Set(agentes.map((a) => a.id))

    // Remove markers for agents that went offline
    markersRef.current.forEach((marker, id) => {
      if (!agenteIds.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    })

    // Add/update markers
    agentes.forEach((a) => {
      if (a.latitude == null || a.longitude == null) return
      const existing = markersRef.current.get(a.id)
      if (existing) {
        existing.setLatLng([a.latitude, a.longitude])
        existing.setPopupContent(popupHtmlAgente(a))
      } else {
        const marker = L.marker([a.latitude, a.longitude], {
          icon: criarIconeAgente(a.emoji),
          zIndexOffset: 1000,
        })
        marker.bindPopup(popupHtmlAgente(a), { minWidth: 180 })
        marker.addTo(map)
        markersRef.current.set(a.id, marker)
      }
    })

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current.clear()
    }
  }, [agentes, map])

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
  const [painelAberto, setPainelAberto] = useState<'utilidades' | 'feed' | 'setores' | 'ranking' | null>(null)
  const [isDark, setIsDark] = useState(isNightTime)
  const [darkManual, setDarkManual] = useState(false)
  const [avatarMap, setAvatarMap] = useState<Map<string, AvatarInfo>>(new Map())
  const [avatarClaims, setAvatarClaims] = useState<AvatarClaim[]>([])
  const [mostrarClaimModal, setMostrarClaimModal] = useState(false)
  const [setorSelecionado, setSetorSelecionado] = useState<number | null>(null)
  const [claimCarregando, setClaimCarregando] = useState(false)

  // Agentes especiais
  const [agentesOnline, setAgentesOnline] = useState<AgenteOnline[]>([])
  const [agenteLogado, setAgenteLogado] = useState<{ id: string; nome: string; tipo: string; emoji: string } | null>(null)
  const [rastreamentoAtivo, setRastreamentoAtivo] = useState(false)
  const [mostrarLoginAgente, setMostrarLoginAgente] = useState(false)
  const [loginAgente, setLoginAgente] = useState({ usuario: '', senha: '' })
  const [loginErro, setLoginErro] = useState('')
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { fotoUrl, carregandoFoto, fecharFoto } = useFotoModal(FOTO_ENDPOINTS)

  const togglePainel = useCallback((painel: 'utilidades' | 'feed' | 'setores' | 'ranking') => {
    setPainelAberto((p) => (p === painel ? null : painel))
  }, [])

  // Dark mode — re-check a cada 60s (só se não for manual)
  useEffect(() => {
    if (darkManual) return
    const interval = setInterval(() => setIsDark(isNightTime()), 60000)
    return () => clearInterval(interval)
  }, [darkManual])

  // Deep link — ler ?lat=X&lng=Y da URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const lat = parseFloat(params.get('lat') || '')
    const lng = parseFloat(params.get('lng') || '')
    if (!isNaN(lat) && !isNaN(lng)) {
      setFlyToTarget({ lat, lng })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Toast de notificacoes
  useToastNotificacao(ultimaDenuncia)

  // Reconciliar visitorId entre browser e PWA (cookie ≠ localStorage)
  useEffect(() => {
    reconcileVisitorId().then((changed) => {
      if (changed) window.location.reload()
    })
  }, [])

  // Registrar visita unica (analytics)
  useEffect(() => {
    registrarVisita()
  }, [])

  // Buscar status de avatares especiais
  const fetchAvatarStatus = useCallback(() => {
    const visitorId = getVisitorId()
    fetch(`/api/avatar/status?visitorId=${visitorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAvatarClaims(data)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetchAvatarStatus()
  }, [fetchAvatarStatus])

  const handleClaim = useCallback(async (chave: string) => {
    setClaimCarregando(true)
    try {
      const visitorId = getVisitorId()
      const res = await fetch('/api/avatar/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, visitorId }),
      })
      if (res.ok) {
        setMostrarClaimModal(false)
        fetchAvatarStatus()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao reivindicar')
      }
    } catch {
      alert('Erro ao reivindicar avatar')
    } finally {
      setClaimCarregando(false)
    }
  }, [fetchAvatarStatus])

  // Mesclar avatar especial do usuario atual no avatarMap
  useEffect(() => {
    const meuAvatar = avatarClaims.find((a) => a.meu)
    if (meuAvatar) {
      setAvatarMap((prev) => {
        const next = new Map(prev)
        next.set(getVisitorId(), { emoji: meuAvatar.emoji, titulo: meuAvatar.titulo })
        return next
      })
    }
  }, [avatarClaims])

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

  // Buscar agentes online (fetch reutilizável)
  const fetchAgentes = useCallback(() => {
    fetch('/api/agentes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAgentesOnline(data)
      })
      .catch(console.error)
  }, [])

  // Fetch inicial + polling a cada 15s (fallback se Socket.io perder eventos)
  useEffect(() => {
    fetchAgentes()
    const interval = setInterval(fetchAgentes, 15000)
    return () => clearInterval(interval)
  }, [fetchAgentes])

  // Restaurar sessão do agente
  useEffect(() => {
    const saved = sessionStorage.getItem('praia10_agente')
    if (saved) {
      try { setAgenteLogado(JSON.parse(saved)) } catch { /* ignore */ }
    }
  }, [])

  // Buscar ranking para avatares nos popups
  useEffect(() => {
    fetch('/api/ranking')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const map = new Map<string, AvatarInfo>()
          for (const r of data) {
            map.set(r.visitorId, { emoji: r.avatar, titulo: r.titulo })
          }
          setAvatarMap(map)
        }
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
      if (navigator.vibrate) navigator.vibrate(200)
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

    socket.on('denuncia-renovada', ({ id, criadoEm }: { id: string; criadoEm: string }) => {
      setDenuncias((prev) =>
        prev.map((d) => (d.id === id ? { ...d, criadoEm } : d))
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

    socket.on('agente-localizacao', (agente: AgenteOnline) => {
      setAgentesOnline((prev) => {
        const idx = prev.findIndex((a) => a.id === agente.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = agente
          return next
        }
        return [...prev, agente]
      })
    })

    socket.on('agente-offline', ({ id }: { id: string }) => {
      setAgentesOnline((prev) => prev.filter((a) => a.id !== id))
    })

    return () => {
      socket.off('nova-denuncia')
      socket.off('denuncia-removida')
      socket.off('denuncia-confirmada')
      socket.off('denuncia-resolvida')
      socket.off('denuncia-renovada')
      socket.off('novo-poi')
      socket.off('poi-removido')
      socket.off('agente-localizacao')
      socket.off('agente-offline')
    }
  }, [])

  // Mensagens recebidas pelo agente (persistem até apagar)
  const [mensagensAgente, setMensagensAgente] = useState<{ id: string; texto: string; enviadoEm: string; socketId: string; respondendo?: boolean }[]>([])

  useEffect(() => {
    if (!agenteLogado) return
    const socket = getSocket()
    const handler = (msg: { agenteId: string; texto: string; enviadoEm: string; socketId: string }) => {
      if (msg.agenteId === agenteLogado.id) {
        setMensagensAgente((prev) => [...prev, { id: crypto.randomUUID(), texto: msg.texto, enviadoEm: msg.enviadoEm, socketId: msg.socketId }])
        if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      }
    }
    socket.on('agente-mensagem', handler)
    return () => { socket.off('agente-mensagem', handler) }
  }, [agenteLogado])

  // Resposta direcionada do agente — só o remetente original vê
  useEffect(() => {
    const socket = getSocket()
    const handler = (msg: { nome: string; emoji: string; texto: string }) => {
      toast(`${msg.emoji} ${msg.nome}: ${msg.texto}`, { duration: 6000 })
      if (navigator.vibrate) navigator.vibrate(200)
    }
    socket.on('agente-resposta', handler)
    return () => { socket.off('agente-resposta', handler) }
  }, [])

  // Reconectar socket e re-buscar dados ao voltar do background (PWA)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const socket = getSocket()
      if (socket.disconnected) socket.connect()
      // Re-buscar dados atualizados
      fetch('/api/denuncias')
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setDenuncias(data) })
        .catch(console.error)
      fetchAgentes()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchAgentes])

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
    const visitorId = getVisitorId()
    try {
      const res = await fetch('/api/denuncias/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ denunciaId: id, sessionId, visitorId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao confirmar')
      }
    } catch (error) {
      console.error('Erro ao confirmar denuncia:', error)
    }
  }, [])

  const handleCompartilhar = useCallback((id: string) => {
    const d = denuncias.find((den) => den.id === id)
    if (!d) return
    const config = TIPO_CONFIG[d.tipo as TipoDenuncia]
    const url = `${window.location.origin}/?lat=${d.latitude}&lng=${d.longitude}`
    const texto = `${config.emoji} ${config.label} na Praia do Morro! Veja no Praia10: ${url}`

    if (navigator.share) {
      navigator.share({ title: 'Praia10', text: texto, url }).catch(() => {})
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(texto).then(() => alert('Link copiado!'))
    }
  }, [denuncias])

  const handleRenovar = useCallback(async (id: string) => {
    const sessionId = getSessionId()
    try {
      const res = await fetch('/api/denuncias/renovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ denunciaId: id, sessionId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao renovar')
      }
    } catch (error) {
      console.error('Erro ao renovar denuncia:', error)
    }
  }, [])

  // Enviar mensagem para agente via popup do mapa
  const handleEnviarMsgAgente = useCallback(async (agenteId: string) => {
    const input = document.getElementById(`msg-agente-${agenteId}`) as HTMLInputElement | null
    const texto = input?.value?.trim()
    if (!texto) return
    try {
      const socket = getSocket()
      await fetch('/api/agentes/mensagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agenteId, texto, remetenteSocketId: socket.id }),
      })
      if (input) input.value = ''
      toast('Mensagem enviada!', { duration: 2000 })
    } catch {
      toast('Erro ao enviar mensagem', { duration: 2000 })
    }
  }, [])

  useWindowFunction('__enviarMsgAgente__', handleEnviarMsgAgente)

  const handleResponderMsg = useCallback(async (msgId: string, texto: string) => {
    if (!agenteLogado || !texto.trim()) return
    const msg = mensagensAgente.find((m) => m.id === msgId)
    if (!msg?.socketId) { toast('Remetente indisponível', { duration: 2000 }); return }
    try {
      await fetch('/api/agentes/mensagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socketId: msg.socketId, nome: agenteLogado.nome, emoji: agenteLogado.emoji, texto }),
      })
      setMensagensAgente((prev) => prev.filter((m) => m.id !== msgId))
    } catch {
      toast('Erro ao responder', { duration: 2000 })
    }
  }, [agenteLogado, mensagensAgente])

  // Login do agente especial
  const handleLoginAgente = useCallback(async () => {
    setLoginErro('')
    try {
      const res = await fetch('/api/agentes/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginAgente),
      })
      if (res.ok) {
        const data = await res.json()
        setAgenteLogado(data)
        sessionStorage.setItem('praia10_agente', JSON.stringify(data))
        setMostrarLoginAgente(false)
        setLoginAgente({ usuario: '', senha: '' })
      } else {
        const data = await res.json()
        setLoginErro(data.error || 'Erro no login')
      }
    } catch {
      setLoginErro('Erro de conexão')
    }
  }, [loginAgente])

  // Toggle rastreamento
  const toggleRastreamento = useCallback(() => {
    if (!agenteLogado) return

    if (rastreamentoAtivo) {
      // Desligar
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setRastreamentoAtivo(false)
      fetch(`/api/agentes/localizacao?agenteId=${agenteLogado.id}`, { method: 'DELETE' }).catch(() => {})
    } else {
      // Ligar
      setRastreamentoAtivo(true)
      let lastLat: number | null = null
      let lastLng: number | null = null

      const enviar = () => {
        if (lastLat != null && lastLng != null) {
          fetch('/api/agentes/localizacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agenteId: agenteLogado.id, latitude: lastLat, longitude: lastLng }),
          }).catch(() => {})
        }
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          lastLat = pos.coords.latitude
          lastLng = pos.coords.longitude
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      )

      // Enviar posição a cada 10 segundos
      enviar()
      intervalRef.current = setInterval(enviar, 10000)
    }
  }, [agenteLogado, rastreamentoAtivo])

  // Logout do agente
  const handleLogoutAgente = useCallback(() => {
    if (rastreamentoAtivo && agenteLogado) {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      watchIdRef.current = null
      intervalRef.current = null
      fetch(`/api/agentes/localizacao?agenteId=${agenteLogado.id}`, { method: 'DELETE' }).catch(() => {})
    }
    setRastreamentoAtivo(false)
    setAgenteLogado(null)
    sessionStorage.removeItem('praia10_agente')
  }, [rastreamentoAtivo, agenteLogado])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
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
          key={isDark ? 'dark' : 'light'}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={isDark ? TILE_DARK : TILE_LIGHT}
        />
        <ClickHandler onClick={handleMapClick} />
        {!mostrarHeatmap && (
          <MarkerClusterGroup
            denuncias={denuncias}
            onRemover={handleRemover}
            onConfirmar={handleConfirmar}
            onCompartilhar={handleCompartilhar}
            onRenovar={handleRenovar}
            avatarMap={avatarMap}
          />
        )}
        <HeatmapLayer denuncias={denuncias} visivel={mostrarHeatmap} />
        <POIMarkersPublic pois={pois} />
        <AgentesMarkers agentes={agentesOnline} />
        <UserLocation />
        <CoordDisplay />
        {setorSelecionado && (() => {
          const setor = SETORES.find((s) => s.id === setorSelecionado)
          if (!setor) return null
          return (
            <Polygon
              positions={setor.poligono.map(([lat, lng]) => [lat, lng] as [number, number])}
              pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 }}
            />
          )
        })()}
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

      {/* Botao dia/noite */}
      <button
        onClick={() => { setDarkManual(true); setIsDark(!isDark) }}
        className="absolute top-28 right-3 z-[500] w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-lg cursor-pointer"
        title={isDark ? 'Modo dia' : 'Modo noite'}
      >
        <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
      </button>

      {/* Botao heatmap */}
      <button
        onClick={() => setMostrarHeatmap(!mostrarHeatmap)}
        className={`absolute top-40 right-3 z-[500] w-10 h-10 flex items-center justify-center rounded-lg shadow-lg cursor-pointer ${
          mostrarHeatmap ? 'bg-orange-500' : 'bg-white'
        }`}
        title="Heatmap"
      >
        <span className="text-lg">🔥</span>
      </button>

      {/* Botao agente especial */}
      {!agenteLogado ? (
        <button
          onClick={() => setMostrarLoginAgente(true)}
          className="absolute top-52 right-3 z-[500] w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-lg cursor-pointer"
          title="Login agente especial"
        >
          <span className="text-lg">🛡️</span>
        </button>
      ) : (
        <div className="absolute top-52 right-3 z-[500] flex flex-col items-end gap-1">
          <button
            onClick={toggleRastreamento}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg shadow-lg text-xs font-bold transition-colors ${
              rastreamentoAtivo
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700'
            }`}
          >
            <span>{agenteLogado.emoji}</span>
            <span>{rastreamentoAtivo ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={handleLogoutAgente}
            className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
          >
            Sair
          </button>
        </div>
      )}

      {/* Painel de mensagens recebidas pelo agente */}
      {agenteLogado && mensagensAgente.length > 0 && (
        <div className="absolute bottom-20 right-3 z-[600] flex flex-col gap-2 max-w-[280px]">
          {mensagensAgente.map((msg) => (
            <div key={msg.id} className="bg-white rounded-xl shadow-lg p-3 border-l-4 border-blue-500">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-800 flex-1">💬 {msg.texto}</p>
                <button
                  onClick={() => setMensagensAgente((prev) => prev.filter((m) => m.id !== msg.id))}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none flex-shrink-0"
                  title="Apagar"
                >×</button>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {new Date(msg.enviadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              {!msg.respondendo ? (
                <button
                  onClick={() => setMensagensAgente((prev) => prev.map((m) => m.id === msg.id ? { ...m, respondendo: true } : m))}
                  className="mt-2 text-xs text-blue-600 font-semibold hover:text-blue-800"
                >
                  Responder
                </button>
              ) : (
                <div className="mt-2 flex gap-1">
                  <input
                    id={`reply-${msg.id}`}
                    type="text"
                    maxLength={200}
                    placeholder="Sua resposta..."
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement
                        handleResponderMsg(msg.id, input.value)
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`reply-${msg.id}`) as HTMLInputElement
                      if (input) handleResponderMsg(msg.id, input.value)
                    }}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700"
                  >
                    Enviar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal login agente */}
      {mostrarLoginAgente && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setMostrarLoginAgente(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 mx-4 max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center mb-1">🛡️ Agente Especial</h3>
            <p className="text-xs text-gray-500 text-center mb-4">Login para rastreamento em tempo real</p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Usuário"
                value={loginAgente.usuario}
                onChange={(e) => setLoginAgente((p) => ({ ...p, usuario: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder="Senha"
                value={loginAgente.senha}
                onChange={(e) => setLoginAgente((p) => ({ ...p, senha: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleLoginAgente()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {loginErro && <p className="text-xs text-red-500 text-center">{loginErro}</p>}
              <button
                onClick={handleLoginAgente}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                Entrar
              </button>
            </div>
            <button
              onClick={() => setMostrarLoginAgente(false)}
              className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
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
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
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
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                painelAberto === 'setores' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>📊</span>
              <span>Setores</span>
            </button>
            <button
              onClick={() => togglePainel('ranking')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                painelAberto === 'ranking' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>🏆</span>
              <span>Top</span>
            </button>
          </div>

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
              <PainelSetores denuncias={denuncias} setorSelecionado={setorSelecionado} onSetorClick={setSetorSelecionado} />
            )}
            {painelAberto === 'ranking' && (
              <RankingColaboradores onClose={() => setPainelAberto(null)} />
            )}
          </div>
        )}
      </div>

      {/* Icone de avatar especial disponivel */}
      {avatarClaims.some((a) => a.disponivel) && !avatarClaims.some((a) => a.meu) && (
        <button
          onClick={() => setMostrarClaimModal(true)}
          className="absolute bottom-28 right-3 z-[500] w-12 h-12 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full shadow-lg cursor-pointer animate-bounce"
          title="Avatar especial disponível!"
          style={{ animationDuration: '2s' }}
        >
          <span className="text-xl">✨</span>
        </button>
      )}

      {/* Modal de claim de avatar */}
      {mostrarClaimModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setMostrarClaimModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center mb-1">✨ Avatares Especiais</h3>
            <p className="text-xs text-gray-500 text-center mb-4">Escolha um avatar único — só o primeiro a reivindicar fica com ele!</p>
            <div className="flex flex-col gap-3">
              {avatarClaims.filter((a) => a.disponivel).map((a) => (
                <button
                  key={a.chave}
                  onClick={() => handleClaim(a.chave)}
                  disabled={claimCarregando}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl hover:from-blue-100 hover:to-purple-100 transition-colors disabled:opacity-50"
                >
                  <span className="text-3xl">{a.emoji}</span>
                  <div className="text-left">
                    <div className="font-bold text-gray-800">{a.titulo}</div>
                    <div className="text-xs text-gray-500">Toque para reivindicar</div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setMostrarClaimModal(false)}
              className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Instrucao + botão GPS */}
      {!formAberto && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <div className="bg-white/95 backdrop-blur rounded-full shadow-lg px-5 py-2.5 pointer-events-none">
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
              Toque no mapa para denunciar
            </span>
          </div>
          <button
            onClick={() => {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setPainelAberto(null)
                  setPontoClicado({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                  setFormAberto(true)
                },
                () => alert('Não foi possível obter sua localização.'),
                { enableHighAccuracy: true, timeout: 10000 }
              )
            }}
            className="bg-blue-600 text-white rounded-full shadow-lg w-10 h-10 flex items-center justify-center text-lg"
            title="Usar minha localização"
          >
            📍
          </button>
        </div>
      )}

      {/* Formulario */}
      {formAberto && pontoClicado && (
        <FormDenuncia
          latitude={pontoClicado.lat}
          longitude={pontoClicado.lng}
          onSubmit={handleSubmit}
          onClose={handleClose}
          denuncias={denuncias}
          onConfirmar={handleConfirmar}
        />
      )}

      {/* Push notifications */}
      <PushSubscriber />

      {/* Modal de foto */}
      <PhotoModal fotoUrl={fotoUrl} carregando={carregandoFoto} onClose={fecharFoto} />
    </div>
  )
}
