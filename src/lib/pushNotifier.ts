import { prisma } from '@/lib/prisma'
import { calcularDistancia } from '@/lib/distancia'
import { TIPO_CONFIG } from '@/types'
import type { TipoDenuncia } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = typeof window === 'undefined' ? require('web-push') : null

const RAIO_NOTIFICACAO_METROS = 1000

interface DenunciaNotificavel {
  id: string
  tipo: string
  latitude: number
  longitude: number
}

export async function notificarPush(denuncia: DenunciaNotificavel) {
  if (!webpush) return
  const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:praia10@example.com'

  if (!vapidPublic || !vapidPrivate) return

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const subscriptions = await prisma.pushSubscription.findMany()
  const config = TIPO_CONFIG[denuncia.tipo as TipoDenuncia]
  const title = `${config?.emoji || '⚠️'} ${config?.label || denuncia.tipo}`
  const body = 'Nova denúncia na Praia do Morro!'
  const url = `/?lat=${denuncia.latitude}&lng=${denuncia.longitude}`

  const payload = JSON.stringify({ title, body, url })
  const idsParaRemover: string[] = []

  await Promise.allSettled(
    subscriptions
      .filter((sub) => {
        if (sub.latitude == null || sub.longitude == null) return true
        return calcularDistancia(sub.latitude, sub.longitude, denuncia.latitude, denuncia.longitude) <= RAIO_NOTIFICACAO_METROS
      })
      .map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode
          if (statusCode === 410 || statusCode === 404) {
            idsParaRemover.push(sub.id)
          }
        }
      })
  )

  if (idsParaRemover.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: idsParaRemover } } })
  }
}
