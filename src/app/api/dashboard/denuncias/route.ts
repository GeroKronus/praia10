import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth-dashboard'

export async function GET(request: Request) {
  const authError = verificarAdmin(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    // Apenas ativas ou resolvidas (expiradas não aparecem)
    const where = {
      OR: [
        { ativa: true },
        { resolvidoEm: { not: null } },
      ],
    }

    const [denuncias, total] = await Promise.all([
      prisma.denuncia.findMany({
        where,
        select: {
          id: true,
          tipo: true,
          descricao: true,
          latitude: true,
          longitude: true,
          sessionId: true,
          confirmacoes: true,
          criadoEm: true,
          ativa: true,
          resolvidoEm: true,
          resolvidoPor: true,
        },
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limit,
      }),
      prisma.denuncia.count({ where }),
    ])

    return NextResponse.json({
      denuncias,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erro ao buscar denúncias (dashboard):', error)
    return NextResponse.json({ error: 'Erro ao buscar denúncias' }, { status: 500 })
  }
}
