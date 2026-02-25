'use client'

import { useState, useMemo } from 'react'
import { TipoDenuncia, TIPO_CONFIG, NovaDenuncia, Denuncia } from '@/types'
import { getVisitorId } from '@/lib/visitor'
import { useFotoUpload } from '@/hooks/useFotoUpload'
import FotoUploadInput from './FotoUploadInput'
import { calcularDistancia, formatarDistancia } from '@/lib/distancia'

interface FormDenunciaProps {
  latitude: number
  longitude: number
  onSubmit: (denuncia: NovaDenuncia) => void
  onClose: () => void
  denuncias: Denuncia[]
  onConfirmar: (id: string) => void
}

const RAIO_PROXIMIDADE = 50 // metros

export default function FormDenuncia({ latitude, longitude, onSubmit, onClose, denuncias, onConfirmar }: FormDenunciaProps) {
  const [tipo, setTipo] = useState<TipoDenuncia | null>(null)
  const [descricao, setDescricao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { fotoPreview, fotoBase64, comprimindo, inputRef, handleFoto, removerFoto } = useFotoUpload()

  // Proximidade: encontrar denúncia do mesmo tipo a menos de 50m
  const denunciaProxima = useMemo(() => {
    if (!tipo) return null
    let melhor: { denuncia: Denuncia; distancia: number } | null = null
    for (const d of denuncias) {
      if (d.tipo !== tipo || d.resolvidoEm) continue
      const dist = calcularDistancia(latitude, longitude, d.latitude, d.longitude)
      if (dist <= RAIO_PROXIMIDADE && (!melhor || dist < melhor.distancia)) {
        melhor = { denuncia: d, distancia: dist }
      }
    }
    return melhor
  }, [tipo, denuncias, latitude, longitude])

  const handleSubmit = async () => {
    if (!tipo) return
    setEnviando(true)
    let sessionId = sessionStorage.getItem('praia10_session')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('praia10_session', sessionId)
    }
    const visitorId = getVisitorId()
    onSubmit({
      tipo,
      descricao: descricao.trim() || undefined,
      latitude,
      longitude,
      sessionId,
      fotoBase64: fotoBase64 || undefined,
      visitorId,
    })
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto p-4 sm:p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Nova Denúncia</h2>
            <p className="text-[10px] text-gray-400">Clique no local correto no mapa</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tipo — botoes compactos em 3 colunas */}
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

        {/* Banner de proximidade */}
        {denunciaProxima && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 mb-2">
              Já existe uma denúncia de <strong>{TIPO_CONFIG[tipo!].label}</strong> a{' '}
              <strong>{formatarDistancia(denunciaProxima.distancia)}</strong>. Deseja confirmar aquela?
            </p>
            <button
              onClick={() => { onConfirmar(denunciaProxima.denuncia.id); onClose() }}
              className="w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors"
            >
              👍 Eu também! (confirmar existente)
            </button>
          </div>
        )}

        {/* Foto + Descricao lado a lado */}
        <div className="flex gap-2 mb-3">
          <FotoUploadInput
            fotoPreview={fotoPreview}
            comprimindo={comprimindo}
            inputRef={inputRef}
            onFoto={handleFoto}
            onRemover={removerFoto}
            label="Tirar foto"
          />

          {/* Descricao */}
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="O que está acontecendo? (opcional)"
            className="flex-1 p-2 border border-gray-300 rounded-lg resize-none text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            maxLength={200}
          />
        </div>

        {/* Botao enviar */}
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
