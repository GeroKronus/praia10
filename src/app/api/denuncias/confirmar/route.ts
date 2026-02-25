import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { denunciaId, sessionId } = await request.json()

    if (!denunciaId || !sessionId) {
      return NextResponse.json({ error: 'Campos obrigatórios: denunciaId, sessionId' }, { status: 400 })
    }

    const denuncia = await prisma.denuncia.findUnique({ where: { id: denunciaId } })
    if (!denuncia || !denuncia.ativa) {
      return NextResponse.json({ error: 'Denúncia não encontrada ou expirada' }, { status: 404 })
    }

    if (denuncia.sessionId === sessionId) {
      return NextResponse.json({ error: 'Não é possível confirmar sua própria denúncia' }, { status: 400 })
    }

    // Tenta criar confirmação (@@unique impede duplicata)
    try {
      await prisma.confirmacao.create({
        data: { denunciaId, sessionId },
      })
    } catch {
      return NextResponse.json({ error: 'Você já confirmou esta denúncia' }, { status: 409 })
    }

    const atualizada = await prisma.denuncia.update({
      where: { id: denunciaId },
      data: { confirmacoes: { increment: 1 } },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io
    if (io) {
      io.emit('denuncia-confirmada', { id: denunciaId, confirmacoes: atualizada.confirmacoes })
    }

    return NextResponse.json({ confirmacoes: atualizada.confirmacoes })
  } catch (error) {
    console.error('Erro ao confirmar denúncia:', error)
    return NextResponse.json({ error: 'Erro ao confirmar denúncia' }, { status: 500 })
  }
}
