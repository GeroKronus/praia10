import { NextResponse } from 'next/server'
import { emitSocket } from '@/lib/socketEmitter'

export async function POST(request: Request) {
  try {
    const { agenteId, texto } = await request.json()

    if (!agenteId || !texto?.trim()) {
      return NextResponse.json({ error: 'agenteId e texto obrigatórios' }, { status: 400 })
    }

    const textoLimpo = texto.trim().slice(0, 200)

    emitSocket('agente-mensagem', {
      agenteId,
      texto: textoLimpo,
      enviadoEm: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao enviar mensagem para agente:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
