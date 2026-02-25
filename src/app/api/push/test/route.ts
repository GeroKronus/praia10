import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth-dashboard'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = typeof window === 'undefined' ? require('web-push') : null

export async function POST(request: Request) {
  const authError = verificarAdmin(request)
  if (authError) return authError

  try {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || 'https://www.praia10.com.br'

    if (!vapidPublic || !vapidPrivate || !webpush) {
      return NextResponse.json({ error: 'VAPID keys não configuradas' }, { status: 500 })
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const subscriptions = await prisma.pushSubscription.findMany()
    if (subscriptions.length === 0) {
      return NextResponse.json({ error: 'Nenhuma subscription registrada', total: 0 }, { status: 404 })
    }

    const payload = JSON.stringify({
      title: '🧪 Teste Praia10',
      body: 'Push notification funcionando!',
      url: '/',
    })

    let enviados = 0
    let falhas = 0
    const idsParaRemover: string[] = []

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          enviados++
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode
          if (statusCode === 410 || statusCode === 404) {
            idsParaRemover.push(sub.id)
          }
          falhas++
        }
      })
    )

    if (idsParaRemover.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: idsParaRemover } } })
    }

    return NextResponse.json({ enviados, falhas, total: subscriptions.length, removidas: idsParaRemover.length })
  } catch (error) {
    console.error('Erro ao enviar push de teste:', error)
    return NextResponse.json({ error: 'Erro ao enviar push' }, { status: 500 })
  }
}
