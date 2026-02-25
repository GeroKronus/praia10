'use client'

interface PhotoModalProps {
  fotoUrl: string | null
  carregando: boolean
  onClose: () => void
}

export default function PhotoModal({ fotoUrl, carregando, onClose }: PhotoModalProps) {
  if (!fotoUrl && !carregando) return null

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      {carregando ? (
        <div className="text-white text-lg">Carregando foto...</div>
      ) : (
        <div className="relative max-w-[90vw] max-h-[90vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotoUrl!}
            alt="Foto"
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={onClose}
            className="absolute top-2 right-2 bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center text-xl"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
