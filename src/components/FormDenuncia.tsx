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
  const [descricao, setDescricao] = useState('')
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
      descricao: descricao.trim() || undefined,
      latitude,
      longitude,
      sessionId,
      fotoBase64: fotoBase64 || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto p-4 sm:p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800">Nova Denúncia</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tipo — botões compactos em 3 colunas */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {Object.entries(TIPO_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setTipo(key as TipoDenuncia)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border-2 transition-all ${
                tipo === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">{config.emoji}</span>
              <span className="text-[10px] font-medium text-gray-600 leading-tight text-center">{config.label}</span>
            </button>
          ))}
        </div>

        {/* Foto + Descrição lado a lado */}
        <div className="flex gap-2 mb-3">
          {/* Foto */}
          <div className="w-24 flex-shrink-0">
            {fotoPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoPreview}
                  alt="Preview"
                  className="w-24 h-[72px] object-cover rounded-lg"
                />
                <button
                  onClick={removerFoto}
                  className="absolute -top-1.5 -right-1.5 bg-black/60 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center h-[72px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors ${comprimindo ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="text-3xl">📷</span>
                <span className="text-[9px] text-gray-400">
                  {comprimindo ? 'Comprimindo...' : 'Tirar foto'}
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

          {/* Descrição */}
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="O que está acontecendo? (opcional)"
            className="flex-1 p-2 border border-gray-300 rounded-lg resize-none text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            maxLength={200}
          />
        </div>

        {/* Botão enviar */}
        <button
          onClick={handleSubmit}
          disabled={!tipo || enviando}
          className={`w-full py-2.5 rounded-lg font-semibold text-white transition-all ${
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
