import { Denuncia } from '@/types'

export interface Setor {
  id: number
  nome: string
  poligono: [number, number][] // [lat, lng][]
}

// Polígonos reais mapeados via Google Maps (sentido oeste → leste)
export const SETORES: Setor[] = [
  {
    id: 1, nome: 'Setor Oeste',
    poligono: [
      [-20.656659, -40.493546],
      [-20.658587, -40.492387],
      [-20.663225, -40.494597],
      [-20.661618, -40.497408],
    ],
  },
  {
    id: 2, nome: 'Setor Centro-Oeste',
    poligono: [
      [-20.653487, -40.490069],
      [-20.655936, -40.488932],
      [-20.658587, -40.492387],
      [-20.656659, -40.493546],
    ],
  },
  {
    id: 3, nome: 'Setor Central',
    poligono: [
      [-20.651419, -40.483825],
      [-20.653326, -40.483503],
      [-20.655936, -40.488932],
      [-20.653487, -40.490069],
    ],
  },
  {
    id: 4, nome: 'Setor Centro-Leste',
    poligono: [
      [-20.650836, -40.479233],
      [-20.653447, -40.478890],
      [-20.653326, -40.483503],
      [-20.651419, -40.483825],
    ],
  },
  {
    id: 5, nome: 'Setor Leste',
    poligono: [
      [-20.654772, -40.472517],
      [-20.655796, -40.473611],
      [-20.653447, -40.478890],
      [-20.650836, -40.479233],
    ],
  },
  {
    id: 6, nome: 'Praia da Cerca',
    poligono: [
      [-20.654732, -40.472689],
      [-20.650676, -40.473633],
      [-20.650395, -40.471916],
      [-20.654109, -40.470929],
    ],
  },
]

// Point-in-polygon (ray casting)
function pontoDentroPoligono(lat: number, lng: number, poligono: [number, number][]): boolean {
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [yi, xi] = poligono[i]
    const [yj, xj] = poligono[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      dentro = !dentro
    }
  }
  return dentro
}

function centroPoligono(poligono: [number, number][]): [number, number] {
  const lat = poligono.reduce((s, p) => s + p[0], 0) / poligono.length
  const lng = poligono.reduce((s, p) => s + p[1], 0) / poligono.length
  return [lat, lng]
}

function distanciaAoCentro(lat: number, lng: number, s: Setor): number {
  const [cLat, cLng] = centroPoligono(s.poligono)
  return Math.sqrt((lat - cLat) ** 2 + (lng - cLng) ** 2)
}

export function getSetorDenuncia(d: Denuncia): Setor | null {
  const exato = SETORES.find((s) => pontoDentroPoligono(d.latitude, d.longitude, s.poligono))
  if (exato) return exato

  // Fallback: setor mais próximo
  let melhor: Setor | null = null
  let menorDist = Infinity
  SETORES.forEach((s) => {
    const dist = distanciaAoCentro(d.latitude, d.longitude, s)
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
