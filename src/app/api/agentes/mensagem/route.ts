import { NextResponse } from 'next/server'
import { emitSocket, emitSocketTo } from '@/lib/socketEmitter'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const texto = body.texto?.trim()?.slice(0, 200)

    if (!texto) {
      return NextResponse.json({ error: 'texto obrigatório' }, { status: 400 })
    }

    if (body.socketId && body.nome) {
      // Resposta direcionada ao remetente original
      emitSocketTo(body.socketId, 'agente-resposta', {
        nome: body.nome,
        emoji: body.emoji || '🛡️',
        texto,
        enviadoEm: new Date().toISOString(),
      })
    } else {
      // Mensagem direta para um agente
      if (!body.agenteId) {
        return NextResponse.json({ error: 'agenteId obrigatório' }, { status: 400 })
      }
      emitSocket('agente-mensagem', {
        agenteId: body.agenteId,
        texto,
        socketId: body.remetenteSocketId || '',
        enviadoEm: new Date().toISOString(),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao enviar mensagem para agente:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
