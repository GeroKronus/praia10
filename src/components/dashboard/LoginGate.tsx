'use client'

import { useState } from 'react'

interface LoginGateProps {
  onLogin: (senha: string) => void
}

export default function LoginGate({ onLogin }: LoginGateProps) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🏖️</div>
          <h1 className="text-2xl font-bold text-gray-800">Praia10</h1>
          <p className="text-sm text-gray-500 mt-1">Dashboard de Fiscalização</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Senha de acesso
          </label>
          <input
            type="password"
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setErro(false) }}
            placeholder="Digite a senha..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800"
            autoFocus
          />
        </div>

        {erro && (
          <p className="text-red-500 text-sm mb-4 text-center">
            Senha incorreta. Tente novamente.
          </p>
        )}

        <button
          type="submit"
          disabled={verificando || !senha}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verificando ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
