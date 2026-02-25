import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth-dashboard'

export async function POST(request: Request) {
  const authError = verificarAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { denunciaId, resolvidoPor } = body

    if (!denunciaId) {
      return NextResponse.json({ error: 'denunciaId é obrigatório' }, { status: 400 })
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

    // Emitir via Socket.io
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (global as any).io
    if (io) {
      io.emit('denuncia-resolvida', {
        id: denuncia.id,
        resolvidoEm: denuncia.resolvidoEm,
        resolvidoPor: denuncia.resolvidoPor,
      })
    }

    return NextResponse.json(denuncia)
  } catch (error) {
    console.error('Erro ao resolver denúncia:', error)
    return NextResponse.json({ error: 'Erro ao resolver denúncia' }, { status: 500 })
  }
}
