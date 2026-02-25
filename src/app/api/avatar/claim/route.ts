import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SPECIAL_AVATARS } from '@/lib/avatares'

export async function POST(request: NextRequest) {
  try {
    const { chave, visitorId } = await request.json()

    if (!chave || !visitorId) {
      return NextResponse.json({ error: 'chave e visitorId obrigatórios' }, { status: 400 })
    }

    if (!SPECIAL_AVATARS[chave]) {
      return NextResponse.json({ error: 'Avatar inválido' }, { status: 400 })
    }

    // Verificar se já foi reivindicado
    const existente = await prisma.avatarEspecial.findUnique({ where: { chave } })
    if (existente) {
      return NextResponse.json({ error: 'Este avatar já foi reivindicado' }, { status: 409 })
    }

    // Verificar se o visitante já tem outro avatar especial
    const jaTemOutro = await prisma.avatarEspecial.findFirst({ where: { visitorId } })
    if (jaTemOutro) {
      return NextResponse.json({ error: 'Você já possui um avatar especial' }, { status: 409 })
    }

    const claim = await prisma.avatarEspecial.create({
      data: { chave, visitorId },
    })

    return NextResponse.json(claim, { status: 201 })
  } catch (error) {
    console.error('Erro ao reivindicar avatar:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
