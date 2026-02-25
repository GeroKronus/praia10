'use client'

import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushSubscriber() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setPermission(Notification.permission)
    }
  }, [])

  const handleSubscribe = async () => {
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      })

      const json = subscription.toJSON()
      const visitorId = localStorage.getItem('praia10_visitor') || ''

      // Obter localização para filtro por raio
      let latitude: number | undefined
      let longitude: number | undefined
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        )
        latitude = pos.coords.latitude
        longitude = pos.coords.longitude
      } catch {
        // sem localização — receberá todas as notificações
      }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          visitorId,
          latitude,
          longitude,
        }),
      })
    } catch (err) {
      console.error('Erro ao ativar push:', err)
    }
  }

  if (permission !== 'default') return null

  return (
    <button
      onClick={handleSubscribe}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[500] bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-1.5"
    >
      <span>🔔</span>
      <span>Ativar notificações</span>
    </button>
  )
}
