'use client'

import { useState, useEffect, useCallback } from 'react'
import { TIPO_CONFIG, TipoDenuncia } from '@/types'

interface DenunciaRow {
  id: string
  tipo: string
  descricao: string | null
  latitude: number
  longitude: number
  confirmacoes: number
  criadoEm: string
  ativa: boolean
  resolvidoEm: string | null
  resolvidoPor: string | null
}

interface TabelaDenunciasProps {
  senha: string
}

export default function TabelaDenuncias({ senha }: TabelaDenunciasProps) {
  const [denuncias, setDenuncias] = useState<DenunciaRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [resolvendo, setResolvendo] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    console.log('[TabelaDenuncias] Buscando página', page)
    setCarregando(true)
    try {
      const res = await fetch(`/api/dashboard/denuncias?page=${page}&limit=20`, {
        headers: { 'x-admin-password': senha },
      })
      console.log('[TabelaDenuncias] Response status:', res.status)
      if (res.ok) {
        const data = await res.json()
        console.log('[TabelaDenuncias] Dados recebidos:', data.total, 'denúncias, página', data.page, 'de', data.totalPages)
        setDenuncias(data.denuncias)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      } else {
        const errText = await res.text()
        console.error('[TabelaDenuncias] Erro API:', res.status, errText)
      }
    } catch (err) {
      console.error('[TabelaDenuncias] Erro fetch:', err)
    } finally {
      setCarregando(false)
    }
  }, [page, senha])

  useEffect(() => {
    buscar()
  }, [buscar])

  const excluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta denúncia?')) return
    setExcluindo(id)
    try {
      const res = await fetch(`/api/denuncias?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': senha },
      })
      if (res.ok) {
        setDenuncias((prev) => prev.filter((d) => d.id !== id))
        setTotal((t) => t - 1)
      }
    } catch (err) {
      console.error('Erro ao excluir:', err)
    } finally {
      setExcluindo(null)
    }
  }

  const resolver = async (id: string) => {
    setResolvendo(id)
    try {
      const res = await fetch('/api/dashboard/resolver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': senha,
        },
        body: JSON.stringify({ denunciaId: id, resolvidoPor: 'Fiscal' }),
      })
      if (res.ok) {
        setDenuncias((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, resolvidoEm: new Date().toISOString(), resolvidoPor: 'Fiscal' }
              : d
          )
        )
      }
    } catch (err) {
      console.error('Erro ao resolver:', err)
    } finally {
      setResolvendo(null)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600">
          Denúncias ({total} total)
        </h3>
        <button
          onClick={buscar}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Atualizar
        </button>
      </div>

      {carregando ? (
        <p className="text-gray-400 text-center py-8">Carregando...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 text-gray-500 font-medium">Tipo</th>
                  <th className="pb-3 text-gray-500 font-medium">Descrição</th>
                  <th className="pb-3 text-gray-500 font-medium">Confirmações</th>
                  <th className="pb-3 text-gray-500 font-medium">Data</th>
                  <th className="pb-3 text-gray-500 font-medium">Status</th>
                  <th className="pb-3 text-gray-500 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {denuncias.map((d) => {
                  const config = TIPO_CONFIG[d.tipo as TipoDenuncia]
                  const resolvido = !!d.resolvidoEm
                  return (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3">
                        <span title={config?.label || d.tipo}>
                          {config?.emoji || '?'} {config?.label || d.tipo}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600 max-w-[200px] truncate">
                        {d.descricao || '-'}
                      </td>
                      <td className="py-3 text-center">{d.confirmacoes}</td>
                      <td className="py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(d.criadoEm).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3">
                        {resolvido ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Resolvido
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Ativa
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {!resolvido && (
                            <button
                              onClick={() => resolver(d.id)}
                              disabled={resolvendo === d.id}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {resolvendo === d.id ? '...' : 'Resolver'}
                            </button>
                          )}
                          <button
                            onClick={() => excluir(d.id)}
                            disabled={excluindo === d.id}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {excluindo === d.id ? '...' : 'Excluir'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
