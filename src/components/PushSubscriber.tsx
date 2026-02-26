'use client'

import { useState, useEffect } from 'react'
import { getVisitorId } from '@/lib/visitor'

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

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone === true)
}

type PushState = 'loading' | 'unsupported' | 'ios-needs-install' | 'default' | 'granted' | 'denied'

export default function PushSubscriber() {
  const [state, setState] = useState<PushState>('loading')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // iOS sem PWA instalada: Notification API não existe
    if (isIOS() && !isStandalone()) {
      setState('ios-needs-install')
      return
    }

    if ('Notification' in window && 'serviceWorker' in navigator) {
      setState(Notification.permission as PushState)
    } else {
      setState('unsupported')
    }
  }, [])

  // Auto-fechar dica de instalação iOS após 5 segundos
  useEffect(() => {
    if (state !== 'ios-needs-install') return
    const timer = setTimeout(() => setDismissed(true), 5000)
    return () => clearTimeout(timer)
  }, [state])

  const handleSubscribe = async () => {
    try {
      const perm = await Notification.requestPermission()
      setState(perm as PushState)
      if (perm !== 'granted') return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      })

      const json = subscription.toJSON()
      const visitorId = getVisitorId()

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

  if (dismissed || state === 'loading' || state === 'unsupported' || state === 'granted' || state === 'denied') return null

  // iOS sem PWA: mostrar dica de instalação
  if (state === 'ios-needs-install') {
    return (
      <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[500] bg-white text-gray-800 px-4 py-3 rounded-2xl shadow-lg text-xs max-w-[280px] text-center">
        <button onClick={() => setDismissed(true)} className="absolute top-1 right-2 text-gray-400 text-base">×</button>
        <p className="font-semibold mb-1">Receba alertas em tempo real!</p>
        <p className="text-gray-500">
          Toque em <span className="inline-block align-middle text-blue-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </span> e depois <strong>&quot;Tela de Início&quot;</strong> para instalar o app e ativar notificações.
        </p>
      </div>
    )
  }

  // Navegador com suporte: botão para ativar
  return (
    <button
      onClick={handleSubscribe}
      className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[500] bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-1.5"
    >
      <span>🔔</span>
      <span>Ativar notificações</span>
    </button>
  )
}
