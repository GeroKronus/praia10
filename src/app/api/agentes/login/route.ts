import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { usuario, senha } = await request.json()

    if (!usuario || !senha) {
      return NextResponse.json({ error: 'Usuário e senha obrigatórios' }, { status: 400 })
    }

    const agente = await prisma.agenteEspecial.findUnique({
      where: { usuario },
      select: { id: true, nome: true, tipo: true, emoji: true, senha: true, ativo: true },
    })

    if (!agente || agente.senha !== senha) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    if (!agente.ativo) {
      return NextResponse.json({ error: 'Conta desativada' }, { status: 403 })
    }

    return NextResponse.json({ id: agente.id, nome: agente.nome, tipo: agente.tipo, emoji: agente.emoji })
  } catch (error) {
    console.error('Erro no login do agente:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
