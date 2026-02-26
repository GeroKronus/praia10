import { Denuncia } from '@/types'

export interface Setor {
  id: number
  nome: string
  lngMin: number
  lngMax: number
  latMin: number
  latMax: number
}

// 5 setores ao longo da Praia do Morro (divididos por longitude, oeste → leste) + Praia da Cerca
// Faixa de latitude ampla para capturar denúncias na praia e arredores
export const SETORES: Setor[] = [
  { id: 1, nome: 'Ponta Oeste',      lngMin: -40.5050, lngMax: -40.4970, latMin: -20.6580, latMax: -20.6390 },
  { id: 2, nome: 'Centro-Oeste',     lngMin: -40.4970, lngMax: -40.4935, latMin: -20.6580, latMax: -20.6390 },
  { id: 3, nome: 'Centro',           lngMin: -40.4935, lngMax: -40.4900, latMin: -20.6580, latMax: -20.6390 },
  { id: 4, nome: 'Centro-Leste',     lngMin: -40.4900, lngMax: -40.4865, latMin: -20.6580, latMax: -20.6390 },
  { id: 5, nome: 'Ponta Leste',      lngMin: -40.4865, lngMax: -40.4790, latMin: -20.6580, latMax: -20.6390 },
  { id: 6, nome: 'Praia da Cerca',   lngMin: -40.4790, lngMax: -40.4690, latMin: -20.6640, latMax: -20.6490 },
]

function distanciaAoSetor(lat: number, lng: number, s: Setor): number {
  const cLat = (s.latMin + s.latMax) / 2
  const cLng = (s.lngMin + s.lngMax) / 2
  return Math.sqrt((lat - cLat) ** 2 + (lng - cLng) ** 2)
}

export function getSetorDenuncia(d: Denuncia): Setor | null {
  // Primeiro: match exato por bounds
  const exato = SETORES.find(
    (s) => d.longitude >= s.lngMin && d.longitude < s.lngMax &&
           d.latitude >= s.latMin && d.latitude < s.latMax
  )
  if (exato) return exato

  // Fallback: setor mais próximo (para denúncias nos arredores)
  let melhor: Setor | null = null
  let menorDist = Infinity
  SETORES.forEach((s) => {
    const dist = distanciaAoSetor(d.latitude, d.longitude, s)
    if (dist < menorDist) { menorDist = dist; melhor = s }
  })
  return melhor
}

export interface SetorStats {
  setor: Setor
  total: number
  status: 'tranquilo' | 'atencao' | 'critico'
  cor: string
}

export function calcularRanking(denuncias: Denuncia[]): SetorStats[] {
  const contagem = new Map<number, number>()
  SETORES.forEach((s) => contagem.set(s.id, 0))

  denuncias.forEach((d) => {
    const setor = getSetorDenuncia(d)
    if (setor) contagem.set(setor.id, (contagem.get(setor.id) || 0) + 1)
  })

  return SETORES.map((setor) => {
    const total = contagem.get(setor.id) || 0
    let status: SetorStats['status']
    let cor: string

    if (total === 0) {
      status = 'tranquilo'
      cor = '#27ae60'
    } else if (total <= 3) {
      status = 'atencao'
      cor = '#f39c12'
    } else {
      status = 'critico'
      cor = '#e74c3c'
    }

    return { setor, total, status, cor }
  }).sort((a, b) => b.total - a.total)
}
