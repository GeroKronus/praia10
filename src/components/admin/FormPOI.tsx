'use client'

import { useState, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { TipoPOI, POI_CONFIG } from '@/types'

interface FormPOIProps {
  latitude: number
  longitude: number
  senha: string
  onCriado: (poi: import('@/types').POI) => void
  onClose: () => void
}

export default function FormPOI({ latitude, longitude, senha, onCriado, onClose }: FormPOIProps) {
  const [tipo, setTipo] = useState<TipoPOI | null>(null)
  const [nome, setNome] = useState('')
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
    try {
      const res = await fetch('/api/pois', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': senha,
        },
        body: JSON.stringify({
          tipo,
          nome: nome.trim() || undefined,
          descricao: descricao.trim() || undefined,
          latitude,
          longitude,
          fotoBase64: fotoBase64 || undefined,
        }),
      })
      if (res.ok) {
        const poi = await res.json()
        onCriado(poi)
      } else {
        alert('Erro ao criar POI')
      }
    } catch {
      alert('Erro ao criar POI')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto p-4 sm:p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800">Novo Ponto de Interesse</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Coordenadas */}
        <p className="text-xs text-gray-400 mb-3">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>

        {/* Tipo - grid de botões */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {Object.entries(POI_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setTipo(key as TipoPOI)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border-2 transition-all ${
                tipo === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">{config.emoji}</span>
              <span className="text-[9px] font-medium text-gray-600 leading-tight text-center">{config.label}</span>
            </button>
          ))}
        </div>

        {/* Nome */}
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome (opcional, ex: Quiosque do Zé)"
          className="w-full p-2 mb-2 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={100}
        />

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
                  {comprimindo ? 'Comprimindo...' : 'Adicionar foto'}
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
            placeholder="Descrição (opcional)"
            className="flex-1 p-2 border border-gray-300 rounded-lg resize-none text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            maxLength={200}
          />
        </div>

        {/* Botão criar */}
        <button
          onClick={handleSubmit}
          disabled={!tipo || enviando}
          className={`w-full py-2.5 rounded-lg font-semibold text-white transition-all ${
            tipo && !enviando
              ? 'bg-green-600 hover:bg-green-700 active:bg-green-800'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {enviando ? 'Criando...' : 'Criar POI'}
        </button>
      </div>
    </div>
  )
}
