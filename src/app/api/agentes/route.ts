import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth-dashboard'

// GET público: agentes online (sem senha)
// GET admin: todos os agentes (com x-admin-password)
export async function GET(request: Request) {
  const isAdmin = request.headers.get('x-admin-password')

  if (isAdmin) {
    const authError = verificarAdmin(request)
    if (authError) return authError

    const agentes = await prisma.agenteEspecial.findMany({
      select: { id: true, usuario: true, nome: true, tipo: true, emoji: true, ativo: true, online: true, criadoEm: true },
      orderBy: { criadoEm: 'desc' },
    })
    return NextResponse.json(agentes)
  }

  // Público: apenas agentes online
  const agentes = await prisma.agenteEspecial.findMany({
    where: { online: true },
    select: { id: true, nome: true, tipo: true, emoji: true, latitude: true, longitude: true },
  })
  return NextResponse.json(agentes)
}

// POST admin: criar agente
export async function POST(request: Request) {
  const authError = verificarAdmin(request)
  if (authError) return authError

  try {
    const { usuario, senha, nome, tipo, emoji } = await request.json()

    if (!usuario || !senha || !nome || !tipo || !emoji) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    const agente = await prisma.agenteEspecial.create({
      data: { usuario, senha, nome, tipo, emoji },
      select: { id: true, usuario: true, nome: true, tipo: true, emoji: true, ativo: true, online: true, criadoEm: true },
    })

    return NextResponse.json(agente, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'Usuário já existe' }, { status: 409 })
    }
    console.error('Erro ao criar agente:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE admin: remover agente
export async function DELETE(request: Request) {
  const authError = verificarAdmin(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
    }

    await prisma.agenteEspecial.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao deletar agente:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
