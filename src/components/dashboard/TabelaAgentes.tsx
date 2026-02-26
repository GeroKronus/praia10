'use client'

import { useState, useEffect, useCallback } from 'react'

interface AgenteRow {
  id: string
  usuario: string
  nome: string
  tipo: string
  emoji: string
  ativo: boolean
  online: boolean
  criadoEm: string
}

const TIPOS_AGENTE = [
  { value: 'policia', label: 'Polícia', emoji: '🚔' },
  { value: 'salva_vidas', label: 'Salva-vidas', emoji: '🏊' },
  { value: 'fiscalizacao', label: 'Fiscalização', emoji: '📋' },
  { value: 'bombeiro', label: 'Bombeiro', emoji: '🚒' },
  { value: 'guarda_municipal', label: 'Guarda Municipal', emoji: '👮' },
]

export default function TabelaAgentes({ senha }: { senha: string }) {
  const [agentes, setAgentes] = useState<AgenteRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [formAberto, setFormAberto] = useState(false)
  const [novoAgente, setNovoAgente] = useState({ usuario: '', senha: '', nome: '', tipo: 'policia', emoji: '🚔' })
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')

  const buscar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/agentes', {
        headers: { 'x-admin-password': senha },
      })
      if (res.ok) {
        setAgentes(await res.json())
      }
    } catch (err) {
      console.error('Erro ao buscar agentes:', err)
    } finally {
      setCarregando(false)
    }
  }, [senha])

  useEffect(() => { buscar() }, [buscar])

  const criar = async () => {
    setErro('')
    if (!novoAgente.usuario || !novoAgente.senha || !novoAgente.nome) {
      setErro('Preencha todos os campos')
      return
    }
    setCriando(true)
    try {
      const res = await fetch('/api/agentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': senha },
        body: JSON.stringify(novoAgente),
      })
      if (res.ok) {
        const agente = await res.json()
        setAgentes((prev) => [agente, ...prev])
        setNovoAgente({ usuario: '', senha: '', nome: '', tipo: 'policia', emoji: '🚔' })
        setFormAberto(false)
      } else {
        const data = await res.json()
        setErro(data.error || 'Erro ao criar')
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCriando(false)
    }
  }

  const excluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return
    setExcluindo(id)
    try {
      const res = await fetch(`/api/agentes?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': senha },
      })
      if (res.ok) {
        setAgentes((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (err) {
      console.error('Erro ao excluir agente:', err)
    } finally {
      setExcluindo(null)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600">
          🛡️ Agentes Especiais ({agentes.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFormAberto(!formAberto)}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {formAberto ? 'Cancelar' : '+ Novo agente'}
          </button>
          <button
            onClick={buscar}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Formulário novo agente */}
      {formAberto && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Usuário (login)"
              value={novoAgente.usuario}
              onChange={(e) => setNovoAgente((p) => ({ ...p, usuario: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Senha"
              value={novoAgente.senha}
              onChange={(e) => setNovoAgente((p) => ({ ...p, senha: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder='Nome (ex: "Viatura PM 01")'
              value={novoAgente.nome}
              onChange={(e) => setNovoAgente((p) => ({ ...p, nome: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={novoAgente.tipo}
              onChange={(e) => {
                const t = TIPOS_AGENTE.find((t) => t.value === e.target.value)
                setNovoAgente((p) => ({ ...p, tipo: e.target.value, emoji: t?.emoji || '🛡️' }))
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIPOS_AGENTE.map((t) => (
                <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
              ))}
            </select>
          </div>
          {erro && <p className="text-xs text-red-500 mt-2">{erro}</p>}
          <button
            onClick={criar}
            disabled={criando}
            className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {criando ? 'Criando...' : 'Criar agente'}
          </button>
        </div>
      )}

      {carregando ? (
        <p className="text-gray-400 text-center py-8">Carregando...</p>
      ) : agentes.length === 0 ? (
        <p className="text-gray-400 text-center py-8">Nenhum agente cadastrado</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-3 text-gray-500 font-medium">Agente</th>
                <th className="pb-3 text-gray-500 font-medium">Usuário</th>
                <th className="pb-3 text-gray-500 font-medium">Tipo</th>
                <th className="pb-3 text-gray-500 font-medium">Status</th>
                <th className="pb-3 text-gray-500 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {agentes.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3">
                    <span>{a.emoji} {a.nome}</span>
                  </td>
                  <td className="py-3 text-gray-600">{a.usuario}</td>
                  <td className="py-3 text-gray-600">{a.tipo}</td>
                  <td className="py-3">
                    {a.online ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => excluir(a.id)}
                      disabled={excluindo === a.id}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {excluindo === a.id ? '...' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
