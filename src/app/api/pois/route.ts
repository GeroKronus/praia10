import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth-dashboard'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fotoId = searchParams.get('fotoId')

    // Retornar foto individual
    if (fotoId) {
      const poi = await prisma.pOI.findUnique({
        where: { id: fotoId },
        select: { fotoBase64: true },
      })
      if (!poi || !poi.fotoBase64) {
        return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
      }
      return NextResponse.json({ fotoBase64: poi.fotoBase64 })
    }

    // Listar POIs (sem foto para economizar banda)
    const pois = await prisma.pOI.findMany({
      select: {
        id: true,
        tipo: true,
        nome: true,
        descricao: true,
        latitude: true,
        longitude: true,
        fotoBase64: false,
        criadoEm: true,
      },
      orderBy: { criadoEm: 'desc' },
    })

    // Verificar quais têm foto
    const ids = pois.map((p) => p.id)
    const comFoto = await prisma.pOI.findMany({
      where: { id: { in: ids }, fotoBase64: { not: null } },
      select: { id: true },
    })
    const idsComFoto = new Set(comFoto.map((p) => p.id))

    const resultado = pois.map((p) => ({
      ...p,
      temFoto: idsComFoto.has(p.id),
    }))

    return NextResponse.json(resultado)
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
    const { tipo, nome, descricao, latitude, longitude, fotoBase64 } = body

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
        fotoBase64: fotoBase64 || null,
      },
    })

    // Emitir sem a foto (pesada) para o socket
    const poiSemFoto = {
      id: poi.id,
      tipo: poi.tipo,
      nome: poi.nome,
      descricao: poi.descricao,
      latitude: poi.latitude,
      longitude: poi.longitude,
      temFoto: !!poi.fotoBase64,
      criadoEm: poi.criadoEm,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io
    if (io) {
      io.emit('novo-poi', poiSemFoto)
    }

    return NextResponse.json(poiSemFoto, { status: 201 })
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
