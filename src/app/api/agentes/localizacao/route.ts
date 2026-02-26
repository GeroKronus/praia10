import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emitSocket } from '@/lib/socketEmitter'

export async function POST(request: Request) {
  try {
    const { agenteId, latitude, longitude } = await request.json()

    if (!agenteId || latitude == null || longitude == null) {
      return NextResponse.json({ error: 'agenteId, latitude e longitude obrigatórios' }, { status: 400 })
    }

    const agente = await prisma.agenteEspecial.update({
      where: { id: agenteId },
      data: { latitude, longitude, online: true, ultimoUpdate: new Date() },
      select: { id: true, nome: true, tipo: true, emoji: true, latitude: true, longitude: true },
    })

    emitSocket('agente-localizacao', agente)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao atualizar localização:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Agente desliga rastreamento
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agenteId = searchParams.get('agenteId')

    if (!agenteId) {
      return NextResponse.json({ error: 'agenteId obrigatório' }, { status: 400 })
    }

    await prisma.agenteEspecial.update({
      where: { id: agenteId },
      data: { online: false, latitude: null, longitude: null },
    })

    emitSocket('agente-offline', { id: agenteId })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao desativar rastreamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
