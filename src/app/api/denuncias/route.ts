import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EXPIRACAO_MINUTOS = 5

export async function GET() {
  try {
    const limite = new Date(Date.now() - EXPIRACAO_MINUTOS * 60 * 1000)

    const denuncias = await prisma.denuncia.findMany({
      where: {
        ativa: true,
        criadoEm: { gte: limite },
      },
      orderBy: { criadoEm: 'desc' },
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
    const { tipo, descricao, latitude, longitude, sessionId } = body

    if (!tipo || latitude == null || longitude == null || !sessionId) {
      return NextResponse.json({ error: 'Campos obrigatórios: tipo, latitude, longitude, sessionId' }, { status: 400 })
    }

    const denuncia = await prisma.denuncia.create({
      data: {
        tipo,
        descricao: descricao || null,
        latitude,
        longitude,
        sessionId,
      },
    })

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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const sessionId = searchParams.get('sessionId')

    if (!id || !sessionId) {
      return NextResponse.json({ error: 'Campos obrigatórios: id, sessionId' }, { status: 400 })
    }

    const denuncia = await prisma.denuncia.findUnique({ where: { id } })

    if (!denuncia) {
      return NextResponse.json({ error: 'Denúncia não encontrada' }, { status: 404 })
    }

    if (denuncia.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Sem permissão para remover esta denúncia' }, { status: 403 })
    }

    // Soft delete — mantém no banco para contabilização
    await prisma.denuncia.update({
      where: { id },
      data: { ativa: false },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io
    if (io) {
      io.emit('denuncia-removida', { id })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao remover denúncia:', error)
    return NextResponse.json({ error: 'Erro ao remover denúncia' }, { status: 500 })
  }
}
