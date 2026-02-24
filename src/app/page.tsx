'use client'

import dynamic from 'next/dynamic'

// Leaflet precisa ser carregado sem SSR
const Mapa = dynamic(() => import('@/components/Mapa'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-4xl mb-4">🏖️</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Praia10</h1>
        <p className="text-gray-500">Carregando mapa...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return (
    <main className="w-full h-screen">
      {/* Header */}
      <div className="absolute top-4 left-4 z-[500] bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
        <span className="text-xl">🏖️</span>
        <div>
          <h1 className="text-sm font-bold text-gray-800 leading-tight">Praia10</h1>
          <p className="text-[10px] text-gray-500 leading-tight">Praia do Morro - Guarapari</p>
        </div>
      </div>

      <Mapa />
    </main>
  )
}
