import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TipoDenuncia } from '@prisma/client'
import { emitSocket } from '@/lib/socketEmitter'
import { buscarFoto, adicionarTemFoto, semFoto } from '@/lib/fotoQuery'
import { EXPIRACAO_CURTA_MS, EXPIRACAO_LONGA_MS, TIPOS_EXPIRACAO_LONGA } from '@/lib/constants'
import { verificarAdmin } from '@/lib/auth-dashboard'
import { notificarPush } from '@/lib/pushNotifier'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fotoId = searchParams.get('fotoId')

    if (fotoId) {
      return buscarFoto(prisma.denuncia, fotoId)
    }

    const limiteCurto = new Date(Date.now() - EXPIRACAO_CURTA_MS)
    const limiteLongo = new Date(Date.now() - EXPIRACAO_LONGA_MS)

    const denuncias = await prisma.denuncia.findMany({
      where: {
        ativa: true,
        OR: [
          { tipo: { in: TIPOS_EXPIRACAO_LONGA as TipoDenuncia[] }, criadoEm: { gte: limiteLongo } },
          { tipo: { notIn: TIPOS_EXPIRACAO_LONGA as TipoDenuncia[] }, criadoEm: { gte: limiteCurto } },
        ],
      },
      select: {
        id: true,
        tipo: true,
        descricao: true,
        latitude: true,
        longitude: true,
        sessionId: true,
        visitorId: true,
        confirmacoes: true,
        fotoBase64: false,
        criadoEm: true,
        ativa: true,
        resolvidoEm: true,
        resolvidoPor: true,
      },
      orderBy: { criadoEm: 'desc' },
    })

    const resultado = await adicionarTemFoto(prisma.denuncia, denuncias)
    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Erro ao buscar denuncias:', error)
    return NextResponse.json({ error: 'Erro ao buscar denuncias' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tipo, descricao, latitude, longitude, sessionId, fotoBase64, visitorId } = body

    if (!tipo || latitude == null || longitude == null || !sessionId) {
      return NextResponse.json({ error: 'Campos obrigatorios: tipo, latitude, longitude, sessionId' }, { status: 400 })
    }

    const denuncia = await prisma.denuncia.create({
      data: {
        tipo,
        descricao: descricao || null,
        latitude,
        longitude,
        sessionId,
        visitorId: visitorId || null,
        fotoBase64: fotoBase64 || null,
      },
    })

    const denunciaSemFoto = semFoto(denuncia)
    emitSocket('nova-denuncia', denunciaSemFoto)

    // Push notifications — fire-and-forget
    notificarPush(denuncia).catch(() => {})

    return NextResponse.json(denunciaSemFoto, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar denuncia:', error)
    return NextResponse.json({ error: 'Erro ao criar denuncia' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const sessionId = searchParams.get('sessionId')
    const isAdmin = !verificarAdmin(request)

    if (!id) {
      return NextResponse.json({ error: 'Campo obrigatorio: id' }, { status: 400 })
    }

    if (!isAdmin && !sessionId) {
      return NextResponse.json({ error: 'Campos obrigatorios: id, sessionId' }, { status: 400 })
    }

    const denuncia = await prisma.denuncia.findUnique({ where: { id } })

    if (!denuncia) {
      return NextResponse.json({ error: 'Denuncia nao encontrada' }, { status: 404 })
    }

    if (!isAdmin && denuncia.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Sem permissao para remover esta denuncia' }, { status: 403 })
    }

    await prisma.denuncia.update({
      where: { id },
      data: { ativa: false },
    })

    emitSocket('denuncia-removida', { id })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao remover denuncia:', error)
    return NextResponse.json({ error: 'Erro ao remover denuncia' }, { status: 500 })
  }
}
