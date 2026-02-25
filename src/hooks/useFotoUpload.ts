'use client'

import { useState, useRef } from 'react'
import imageCompression from 'browser-image-compression'

export function useFotoUpload() {
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoBase64, setFotoBase64] = useState<string | null>(null)
  const [comprimindo, setComprimindo] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setComprimindo(true)
    try {
      const comprimida = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      })

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        setFotoPreview(base64)
        setFotoBase64(base64)
      }
      reader.readAsDataURL(comprimida)
    } catch (err) {
      console.error('Erro ao comprimir foto:', err)
    } finally {
      setComprimindo(false)
    }
  }

  const removerFoto = () => {
    setFotoPreview(null)
    setFotoBase64(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return { fotoPreview, fotoBase64, comprimindo, inputRef, handleFoto, removerFoto }
}
