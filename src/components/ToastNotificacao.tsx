'use client'

import { useEffect, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Denuncia, TIPO_CONFIG, TipoDenuncia } from '@/types'
import { calcularDistancia, formatarDistancia } from '@/lib/distancia'

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1f2937',
          color: '#fff',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          maxWidth: '360px',
        },
      }}
    />
  )
}

export function useToastNotificacao(novaDenuncia: Denuncia | null) {
  const posicaoRef = useRef<{ lat: number; lng: number } | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    sessionIdRef.current = sessionStorage.getItem('praia10_session')

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          posicaoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 30000 }
      )
      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  useEffect(() => {
    if (!novaDenuncia) return
    // Não notificar denúncias próprias
    if (novaDenuncia.sessionId === sessionIdRef.current) return

    const config = TIPO_CONFIG[novaDenuncia.tipo as TipoDenuncia]
    let mensagem = `${config.emoji} ${config.label}`

    if (posicaoRef.current) {
      const dist = calcularDistancia(
        posicaoRef.current.lat,
        posicaoRef.current.lng,
        novaDenuncia.latitude,
        novaDenuncia.longitude
      )
      // Só notificar se estiver a menos de 500m
      if (dist > 500) return
      mensagem += ` a ${formatarDistancia(dist)}`
    }

    toast(mensagem, { icon: config.emoji })
  }, [novaDenuncia])
}
