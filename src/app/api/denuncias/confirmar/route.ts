import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emitSocket } from '@/lib/socketEmitter'

export async function POST(request: Request) {
  try {
    const { denunciaId, sessionId, visitorId } = await request.json()

    if (!denunciaId || !sessionId) {
      return NextResponse.json({ error: 'Campos obrigatorios: denunciaId, sessionId' }, { status: 400 })
    }

    const denuncia = await prisma.denuncia.findUnique({ where: { id: denunciaId } })
    if (!denuncia || !denuncia.ativa) {
      return NextResponse.json({ error: 'Denuncia nao encontrada ou expirada' }, { status: 404 })
    }

    if (denuncia.sessionId === sessionId) {
      return NextResponse.json({ error: 'Nao e possivel confirmar sua propria denuncia' }, { status: 400 })
    }

    // Tenta criar confirmacao (@@unique impede duplicata)
    try {
      await prisma.confirmacao.create({
        data: { denunciaId, sessionId, visitorId: visitorId || null },
      })
    } catch {
      return NextResponse.json({ error: 'Voce ja confirmou esta denuncia' }, { status: 409 })
    }

    const atualizada = await prisma.denuncia.update({
      where: { id: denunciaId },
      data: { confirmacoes: { increment: 1 } },
    })

    emitSocket('denuncia-confirmada', { id: denunciaId, confirmacoes: atualizada.confirmacoes })

    return NextResponse.json({ confirmacoes: atualizada.confirmacoes })
  } catch (error) {
    console.error('Erro ao confirmar denuncia:', error)
    return NextResponse.json({ error: 'Erro ao confirmar denuncia' }, { status: 500 })
  }
}
