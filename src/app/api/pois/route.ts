import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth-dashboard'

export async function GET() {
  try {
    const pois = await prisma.pOI.findMany({
      orderBy: { criadoEm: 'desc' },
    })
    return NextResponse.json(pois)
  } catch (error) {
    console.error('Erro ao buscar POIs:', error)
    return NextResponse.json({ error: 'Erro ao buscar POIs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authError = verificarAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { tipo, nome, descricao, latitude, longitude } = body

    if (!tipo || latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Campos obrigatórios: tipo, latitude, longitude' }, { status: 400 })
    }

    const poi = await prisma.pOI.create({
      data: {
        tipo,
        nome: nome || null,
        descricao: descricao || null,
        latitude,
        longitude,
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io
    if (io) {
      io.emit('novo-poi', poi)
    }

    return NextResponse.json(poi, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar POI:', error)
    return NextResponse.json({ error: 'Erro ao criar POI' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const authError = verificarAdmin(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Campo obrigatório: id' }, { status: 400 })
    }

    const poi = await prisma.pOI.findUnique({ where: { id } })
    if (!poi) {
      return NextResponse.json({ error: 'POI não encontrado' }, { status: 404 })
    }

    await prisma.pOI.delete({ where: { id } })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io
    if (io) {
      io.emit('poi-removido', { id })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao deletar POI:', error)
    return NextResponse.json({ error: 'Erro ao deletar POI' }, { status: 500 })
  }
}
