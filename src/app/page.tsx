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
      <Mapa />
    </main>
  )
}
