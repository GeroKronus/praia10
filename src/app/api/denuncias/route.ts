import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EXPIRACAO_MINUTOS = 10

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fotoId = searchParams.get('fotoId')

    // Retornar foto individual
    if (fotoId) {
      const denuncia = await prisma.denuncia.findUnique({
        where: { id: fotoId },
        select: { fotoBase64: true },
      })
      if (!denuncia || !denuncia.fotoBase64) {
        return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
      }
      return NextResponse.json({ fotoBase64: denuncia.fotoBase64 })
    }

    // Listar denúncias ativas (sem foto para economizar banda)
    const limite = new Date(Date.now() - EXPIRACAO_MINUTOS * 60 * 1000)

    const denuncias = await prisma.denuncia.findMany({
      where: {
        ativa: true,
        criadoEm: { gte: limite },
      },
      select: {
        id: true,
        tipo: true,
        descricao: true,
        latitude: true,
        longitude: true,
        sessionId: true,
        confirmacoes: true,
        fotoBase64: false,
        criadoEm: true,
        ativa: true,
        resolvidoEm: true,
        resolvidoPor: true,
      },
      orderBy: { criadoEm: 'desc' },
    })

    // Adicionar campo temFoto verificando no banco
    const ids = denuncias.map((d) => d.id)
    const comFoto = await prisma.denuncia.findMany({
      where: { id: { in: ids }, fotoBase64: { not: null } },
      select: { id: true },
    })
    const idsComFoto = new Set(comFoto.map((d) => d.id))

    const resultado = denuncias.map((d) => ({
      ...d,
      temFoto: idsComFoto.has(d.id),
    }))

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Erro ao buscar denúncias:', error)
    return NextResponse.json({ error: 'Erro ao buscar denúncias' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tipo, descricao, latitude, longitude, sessionId, fotoBase64 } = body

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
        fotoBase64: fotoBase64 || null,
      },
    })

    // Emitir sem a foto (pesada) para o socket
    const denunciaSemFoto = {
      id: denuncia.id,
      tipo: denuncia.tipo,
      descricao: denuncia.descricao,
      latitude: denuncia.latitude,
      longitude: denuncia.longitude,
      sessionId: denuncia.sessionId,
      confirmacoes: denuncia.confirmacoes,
      temFoto: !!denuncia.fotoBase64,
      criadoEm: denuncia.criadoEm,
      resolvidoEm: denuncia.resolvidoEm,
      resolvidoPor: denuncia.resolvidoPor,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io
    if (io) {
      io.emit('nova-denuncia', denunciaSemFoto)
    }

    return NextResponse.json(denunciaSemFoto, { status: 201 })
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
