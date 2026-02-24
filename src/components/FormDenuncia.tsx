'use client'

import { useState } from 'react'
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
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async () => {
    if (!tipo) return
    setEnviando(true)
    onSubmit({
      tipo,
      descricao: descricao.trim() || undefined,
      latitude,
      longitude,
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

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição (opcional)
          </label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o que está acontecendo..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            maxLength={500}
          />
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
