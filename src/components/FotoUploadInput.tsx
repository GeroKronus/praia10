'use client'

interface FotoUploadInputProps {
  fotoPreview: string | null
  comprimindo: boolean
  inputRef: React.RefObject<HTMLInputElement>
  onFoto: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemover: () => void
  label?: string
}

export default function FotoUploadInput({
  fotoPreview,
  comprimindo,
  inputRef,
  onFoto,
  onRemover,
  label = 'Tirar foto',
}: FotoUploadInputProps) {
  return (
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
            onClick={onRemover}
            className="absolute -top-1.5 -right-1.5 bg-black/60 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs"
          >
            ×
          </button>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center h-[72px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors ${comprimindo ? 'opacity-50 pointer-events-none' : ''}`}>
          <span className="text-3xl">📷</span>
          <span className="text-[9px] text-gray-400">
            {comprimindo ? 'Comprimindo...' : label}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFoto}
            className="hidden"
          />
        </label>
      )}
    </div>
  )
}
