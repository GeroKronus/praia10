import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emitSocket } from '@/lib/socketEmitter'

export async function POST(request: NextRequest) {
  try {
    const { denunciaId, sessionId } = await request.json()

    if (!denunciaId || !sessionId) {
      return NextResponse.json({ error: 'denunciaId e sessionId obrigatórios' }, { status: 400 })
    }

    const denuncia = await prisma.denuncia.findUnique({ where: { id: denunciaId } })

    if (!denuncia || !denuncia.ativa) {
      return NextResponse.json({ error: 'Denúncia não encontrada' }, { status: 404 })
    }

    if (denuncia.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Apenas o autor pode renovar' }, { status: 403 })
    }

    const atualizada = await prisma.denuncia.update({
      where: { id: denunciaId },
      data: { criadoEm: new Date() },
      select: { id: true, criadoEm: true },
    })

    emitSocket('denuncia-renovada', { id: atualizada.id, criadoEm: atualizada.criadoEm })

    return NextResponse.json(atualizada)
  } catch (error) {
    console.error('Erro ao renovar denúncia:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
