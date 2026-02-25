import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth-dashboard'
import { emitSocket } from '@/lib/socketEmitter'
import { semFoto } from '@/lib/fotoQuery'
import { CENTRO_PRAIA_MORRO } from '@/lib/constants'

const TIPOS = ['SOM_ALTO', 'DROGAS', 'ANIMAIS', 'LIXO', 'AMBULANTE_IRREGULAR', 'CRIANCA_PERDIDA', 'OUTROS'] as const

export async function POST(request: Request) {
  const authError = verificarAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { quantidade = 1, visitorId, perto } = body

    const criadas = []
    for (let i = 0; i < Math.min(quantidade, 10); i++) {
      const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)]
      // Gerar coordenadas próximas ao centro (ou a um ponto específico)
      const baseLat = perto?.lat ?? CENTRO_PRAIA_MORRO[0]
      const baseLng = perto?.lng ?? CENTRO_PRAIA_MORRO[1]
      const offsetLat = (Math.random() - 0.5) * 0.004 // ~200m
      const offsetLng = (Math.random() - 0.5) * 0.004

      const denuncia = await prisma.denuncia.create({
        data: {
          tipo,
          descricao: `[TESTE] Denúncia fake #${Date.now().toString(36)}`,
          latitude: baseLat + offsetLat,
          longitude: baseLng + offsetLng,
          sessionId: `fake-${crypto.randomUUID()}`,
          visitorId: visitorId || `test-visitor-${i}`,
        },
      })

      const denunciaSemFoto = semFoto(denuncia)
      emitSocket('nova-denuncia', denunciaSemFoto)
      criadas.push(denunciaSemFoto)
    }

    return NextResponse.json({ criadas: criadas.length, denuncias: criadas }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar denúncia fake:', error)
    return NextResponse.json({ error: 'Erro ao criar denúncia fake' }, { status: 500 })
  }
}
