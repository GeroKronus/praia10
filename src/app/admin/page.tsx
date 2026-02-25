'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const AdminMapa = dynamic(() => import('@/components/admin/AdminMapa'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-4xl mb-4">📍</div>
        <p className="text-gray-500">Carregando mapa...</p>
      </div>
    </div>
  ),
})

function LoginAdmin({ onLogin }: { onLogin: (senha: string) => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(false)
  const [verificando, setVerificando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(false)
    setVerificando(true)
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { 'x-admin-password': senha },
      })
      if (res.ok) {
        onLogin(senha)
      } else {
        setErro(true)
      }
    } catch {
      setErro(true)
    } finally {
      setVerificando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📍</div>
          <h1 className="text-2xl font-bold text-gray-800">Admin POIs</h1>
          <p className="text-sm text-gray-500 mt-1">Gerenciar pontos de interesse</p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha de acesso</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setErro(false) }}
            placeholder="Digite a senha..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-gray-800"
            autoFocus
          />
        </div>
        {erro && <p className="text-red-500 text-sm mb-4 text-center">Senha incorreta.</p>}
        <button
          type="submit"
          disabled={verificando || !senha}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verificando ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

export default function AdminPage() {
  const [senha, setSenha] = useState<string | null>(null)

  if (!senha) {
    return <LoginAdmin onLogin={setSenha} />
  }

  return <AdminMapa senha={senha} />
}
