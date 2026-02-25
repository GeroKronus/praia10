'use client'

import { useState, useEffect, useCallback } from 'react'

interface FotoEndpoint {
  windowName: string
  eventName: string
  apiUrl: string
}

export function useFotoModal(endpoints: FotoEndpoint[]) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [carregandoFoto, setCarregandoFoto] = useState(false)

  const fecharFoto = useCallback(() => {
    setFotoUrl(null)
    setCarregandoFoto(false)
  }, [])

  useEffect(() => {
    const handlers: { event: string; handler: (e: Event) => void }[] = []

    endpoints.forEach(({ windowName, eventName, apiUrl }) => {
      // Registrar window function que dispara o custom event
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any)[windowName] = (id: string) => {
        window.dispatchEvent(new CustomEvent(eventName, { detail: id }))
      }

      // Listener para o custom event que faz o fetch
      const handler = async (e: Event) => {
        const id = (e as CustomEvent).detail
        setCarregandoFoto(true)
        try {
          const res = await fetch(`${apiUrl}?fotoId=${id}`)
          const data = await res.json()
          if (data.fotoBase64) setFotoUrl(data.fotoBase64)
        } catch (err) {
          console.error('Erro ao carregar foto:', err)
        } finally {
          setCarregandoFoto(false)
        }
      }

      window.addEventListener(eventName, handler)
      handlers.push({ event: eventName, handler })
    })

    return () => {
      endpoints.forEach(({ windowName }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any)[windowName]
      })
      handlers.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler)
      })
    }
  }, [endpoints])

  return { fotoUrl, carregandoFoto, fecharFoto }
}
