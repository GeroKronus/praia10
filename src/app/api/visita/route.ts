import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { visitorId } = await request.json()

    if (!visitorId || typeof visitorId !== 'string') {
      return NextResponse.json({ error: 'visitorId obrigatório' }, { status: 400 })
    }

    const data = new Date().toISOString().slice(0, 10) // "2026-02-25"

    await prisma.visita.upsert({
      where: { visitorId_data: { visitorId, data } },
      update: {},
      create: { visitorId, data },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao registrar visita:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
