import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SPECIAL_AVATARS } from '@/lib/avatares'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const visitorId = request.nextUrl.searchParams.get('visitorId') || ''

    const claims = await prisma.avatarEspecial.findMany()
    const claimMap = new Map(claims.map((c) => [c.chave, c.visitorId]))

    const lista = Object.entries(SPECIAL_AVATARS).map(([chave, avatar]) => {
      const donoId = claimMap.get(chave)
      return {
        chave,
        emoji: avatar.emoji,
        titulo: avatar.titulo,
        disponivel: !donoId,
        meu: donoId === visitorId,
      }
    })

    return NextResponse.json(lista)
  } catch (error) {
    console.error('Erro ao buscar status de avatares:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
