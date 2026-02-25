import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvatarTier, SPECIAL_AVATARS } from '@/lib/avatares'

export async function GET() {
  try {
    const [denunciasPorVisitor, confirmacoesPorVisitor, avatarEspeciais] = await Promise.all([
      prisma.denuncia.groupBy({
        by: ['visitorId'],
        where: { visitorId: { not: null } },
        _count: { id: true },
      }),
      prisma.confirmacao.groupBy({
        by: ['visitorId'],
        where: { visitorId: { not: null } },
        _count: { id: true },
      }),
      prisma.avatarEspecial.findMany(),
    ])

    // Map de visitorId → avatar especial
    const specialMap = new Map(
      avatarEspeciais.map((a) => [a.visitorId, SPECIAL_AVATARS[a.chave]])
    )

    const mapa = new Map<string, { denuncias: number; confirmacoes: number }>()

    for (const d of denunciasPorVisitor) {
      if (!d.visitorId) continue
      const entry = mapa.get(d.visitorId) || { denuncias: 0, confirmacoes: 0 }
      entry.denuncias = d._count.id
      mapa.set(d.visitorId, entry)
    }

    for (const c of confirmacoesPorVisitor) {
      if (!c.visitorId) continue
      const entry = mapa.get(c.visitorId) || { denuncias: 0, confirmacoes: 0 }
      entry.confirmacoes = c._count.id
      mapa.set(c.visitorId, entry)
    }

    const ranking = Array.from(mapa.entries())
      .map(([visitorId, stats]) => {
        const total = stats.denuncias + stats.confirmacoes
        const special = specialMap.get(visitorId)
        const tier = special || getAvatarTier(total)
        return {
          visitorId,
          avatar: tier.emoji,
          titulo: tier.titulo,
          denuncias: stats.denuncias,
          confirmacoes: stats.confirmacoes,
          total,
        }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)

    return NextResponse.json(ranking)
  } catch (error) {
    console.error('Erro ao buscar ranking:', error)
    return NextResponse.json({ error: 'Erro ao buscar ranking' }, { status: 500 })
  }
}
