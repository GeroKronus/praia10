import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth-dashboard'
import { emitSocket } from '@/lib/socketEmitter'
import { buscarFoto, adicionarTemFoto, semFoto } from '@/lib/fotoQuery'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fotoId = searchParams.get('fotoId')

    if (fotoId) {
      return buscarFoto(prisma.pOI, fotoId)
    }

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

    const resultado = await adicionarTemFoto(prisma.pOI, pois)
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
      return NextResponse.json({ error: 'Campos obrigatorios: tipo, latitude, longitude' }, { status: 400 })
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

    const poiSemFoto = semFoto(poi)
    emitSocket('novo-poi', poiSemFoto)

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
      return NextResponse.json({ error: 'Campo obrigatorio: id' }, { status: 400 })
    }

    const poi = await prisma.pOI.findUnique({ where: { id } })
    if (!poi) {
      return NextResponse.json({ error: 'POI nao encontrado' }, { status: 404 })
    }

    await prisma.pOI.delete({ where: { id } })

    emitSocket('poi-removido', { id })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao deletar POI:', error)
    return NextResponse.json({ error: 'Erro ao deletar POI' }, { status: 500 })
  }
}
