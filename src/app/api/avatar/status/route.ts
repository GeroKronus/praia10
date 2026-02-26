import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SPECIAL_AVATARS } from '@/lib/avatares'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const visitorId = request.nextUrl.searchParams.get('visitorId') || ''

    // Buscar claims deste visitante
    const meusClaims = await prisma.avatarEspecial.findMany({
      where: { visitorId },
    })
    const minhasChaves = new Set(meusClaims.map((c) => c.chave))

    const lista = Object.entries(SPECIAL_AVATARS).map(([chave, avatar]) => ({
      chave,
      emoji: avatar.emoji,
      titulo: avatar.titulo,
      disponivel: !minhasChaves.has(chave),
      meu: minhasChaves.has(chave),
    }))

    return NextResponse.json(lista)
  } catch (error) {
    console.error('Erro ao buscar status de avatares:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
