import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const denuncias = await prisma.denuncia.findMany({
      orderBy: { criadoEm: 'desc' },
      take: 500,
    })
    return NextResponse.json(denuncias)
  } catch (error) {
    console.error('Erro ao buscar denúncias:', error)
    return NextResponse.json({ error: 'Erro ao buscar denúncias' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tipo, descricao, latitude, longitude } = body

    if (!tipo || latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Campos obrigatórios: tipo, latitude, longitude' }, { status: 400 })
    }

    const denuncia = await prisma.denuncia.create({
      data: {
        tipo,
        descricao: descricao || null,
        latitude,
        longitude,
      },
    })

    // Emitir via Socket.io para todos os clientes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io
    if (io) {
      io.emit('nova-denuncia', denuncia)
    }

    return NextResponse.json(denuncia, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar denúncia:', error)
    return NextResponse.json({ error: 'Erro ao criar denúncia' }, { status: 500 })
  }
}
