import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth-dashboard'
import { emitSocket } from '@/lib/socketEmitter'

export async function POST(request: Request) {
  const authError = verificarAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { denunciaId, resolvidoPor } = body

    if (!denunciaId) {
      return NextResponse.json({ error: 'denunciaId e obrigatorio' }, { status: 400 })
    }

    const denuncia = await prisma.denuncia.update({
      where: { id: denunciaId },
      data: {
        resolvidoEm: new Date(),
        resolvidoPor: resolvidoPor || 'Admin',
      },
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
    })

    emitSocket('denuncia-resolvida', {
      id: denuncia.id,
      resolvidoEm: denuncia.resolvidoEm,
      resolvidoPor: denuncia.resolvidoPor,
    })

    return NextResponse.json(denuncia)
  } catch (error) {
    console.error('Erro ao resolver denuncia:', error)
    return NextResponse.json({ error: 'Erro ao resolver denuncia' }, { status: 500 })
  }
}
