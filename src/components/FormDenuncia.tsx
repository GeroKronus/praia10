'use client'

import { useState, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { TipoDenuncia, TIPO_CONFIG, NovaDenuncia } from '@/types'

interface FormDenunciaProps {
  latitude: number
  longitude: number
  onSubmit: (denuncia: NovaDenuncia) => void
  onClose: () => void
}

export default function FormDenuncia({ latitude, longitude, onSubmit, onClose }: FormDenunciaProps) {
  const [tipo, setTipo] = useState<TipoDenuncia | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoBase64, setFotoBase64] = useState<string | null>(null)
  const [comprimindo, setComprimindo] = useState(false)
  const [enviando, setEnviando] = useState(false)
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

  const handleSubmit = async () => {
    if (!tipo) return
    setEnviando(true)
    let sessionId = sessionStorage.getItem('praia10_session')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('praia10_session', sessionId)
    }
    onSubmit({
      tipo,
      descricao: undefined,
      latitude,
      longitude,
      sessionId,
      fotoBase64: fotoBase64 || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Nova Denúncia</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          📍 {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo da ocorrência
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TIPO_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setTipo(key as TipoDenuncia)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                  tipo === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{config.emoji}</span>
                <span className="text-sm font-medium text-gray-700">{config.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Foto */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Foto (opcional)
          </label>
          {fotoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoPreview}
                alt="Preview"
                className="w-full h-40 object-cover rounded-lg"
              />
              <button
                onClick={removerFoto}
                className="absolute top-2 right-2 bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm"
              >
                ×
              </button>
            </div>
          ) : (
            <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors ${comprimindo ? 'opacity-50 pointer-events-none' : ''}`}>
              <span className="text-2xl">📷</span>
              <span className="text-sm text-gray-500">
                {comprimindo ? 'Comprimindo...' : 'Tirar foto ou escolher'}
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFoto}
                className="hidden"
              />
            </label>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!tipo || enviando}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
            tipo && !enviando
              ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {enviando ? 'Enviando...' : 'Enviar Denúncia'}
        </button>
      </div>
    </div>
  )
}
