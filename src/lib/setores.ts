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
      [-20.660635, -40.497451],
      [-20.663345, -40.494533],
      [-20.657041, -40.490091],
      [-20.655735, -40.491250],
    ],
  },
  {
    id: 2, nome: 'Setor Centro-Oeste',
    poligono: [
      [-20.655735, -40.491250],
      [-20.657041, -40.490091],
      [-20.653868, -40.484973],
      [-20.652503, -40.485445],
    ],
  },
  {
    id: 3, nome: 'Setor Centro-Leste',
    poligono: [
      [-20.652503, -40.485445],
      [-20.653868, -40.484973],
      [-20.653244, -40.479268],
      [-20.651874, -40.479406],
    ],
  },
  {
    id: 4, nome: 'Setor Leste',
    poligono: [
      [-20.651874, -40.479406],
      [-20.653244, -40.479268],
      [-20.655458, -40.473673],
      [-20.654457, -40.472702],
    ],
  },
  {
    id: 5, nome: 'Praia da Cerca',
    poligono: [
      [-20.650530, -40.473568],
      [-20.650415, -40.471954],
      [-20.654457, -40.472702],
      [-20.655458, -40.473673],
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
  // Match exato por polígono
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
