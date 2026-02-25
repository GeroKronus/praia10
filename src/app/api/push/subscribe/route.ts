import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { endpoint, p256dh, auth, visitorId, latitude, longitude } = await request.json()

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Campos obrigatórios: endpoint, p256dh, auth' }, { status: 400 })
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, visitorId: visitorId || null, latitude: latitude ?? null, longitude: longitude ?? null },
      create: { endpoint, p256dh, auth, visitorId: visitorId || null, latitude: latitude ?? null, longitude: longitude ?? null },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao salvar subscription:', error)
    return NextResponse.json({ error: 'Erro ao salvar subscription' }, { status: 500 })
  }
}
