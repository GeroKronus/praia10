'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import LoginGate from '@/components/dashboard/LoginGate'
import StatsCards from '@/components/dashboard/StatsCards'
import TabelaDenuncias from '@/components/dashboard/TabelaDenuncias'
import TabelaAgentes from '@/components/dashboard/TabelaAgentes'
import { DashboardStats } from '@/types'

const ChartPorTipo = dynamic(() => import('@/components/dashboard/ChartPorTipo'), { ssr: false })
const ChartPorHora = dynamic(() => import('@/components/dashboard/ChartPorHora'), { ssr: false })
const ChartPorDia = dynamic(() => import('@/components/dashboard/ChartPorDia'), { ssr: false })

export default function DashboardPage() {
  const [senha, setSenha] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [carregando, setCarregando] = useState(false)

  const buscarStats = useCallback(async () => {
    if (!senha) return
    setCarregando(true)
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { 'x-admin-password': senha },
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Erro ao buscar stats:', err)
    } finally {
      setCarregando(false)
    }
  }, [senha])

  useEffect(() => {
    if (senha) {
      buscarStats()
      const interval = setInterval(buscarStats, 30000)
      return () => clearInterval(interval)
    }
  }, [senha, buscarStats])

  // Debug: verificar overflow no F12
  useEffect(() => {
    if (senha) {
      const html = document.documentElement
      const body = document.body
      console.log('[Dashboard Debug] html overflow:', getComputedStyle(html).overflow)
      console.log('[Dashboard Debug] body overflow:', getComputedStyle(body).overflow)
      console.log('[Dashboard Debug] html height:', getComputedStyle(html).height)
      console.log('[Dashboard Debug] body height:', getComputedStyle(body).height)
      console.log('[Dashboard Debug] .dashboard-page exists:', !!document.querySelector('.dashboard-page'))

      // Forçar overflow auto como fallback
      html.style.overflow = 'auto'
      html.style.height = 'auto'
      body.style.overflow = 'auto'
      body.style.height = 'auto'
      console.log('[Dashboard Debug] overflow forçado para auto')

      return () => {
        html.style.overflow = ''
        html.style.height = ''
        body.style.overflow = ''
        body.style.height = ''
      }
    }
  }, [senha])

  if (!senha) {
    return <LoginGate onLogin={setSenha} />
  }

  return (
    <div className="min-h-screen bg-gray-50 dashboard-page">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏖️</span>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Praia10</h1>
              <p className="text-xs text-gray-500">Dashboard de Fiscalização</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={buscarStats}
              disabled={carregando}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              {carregando ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button
              onClick={() => setSenha(null)}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <StatsCards
            totalHoje={stats.totalHoje}
            totalSemana={stats.totalSemana}
            ativasAgora={stats.ativasAgora}
            resolvidasHoje={stats.resolvidasHoje}
            visitantesHoje={stats.visitantesHoje}
          />
        )}

        {/* Charts Row */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartPorTipo data={stats.porTipo} />
            <ChartPorHora data={stats.porHora} />
          </div>
        )}

        {/* Chart Full Width */}
        {stats && (
          <ChartPorDia data={stats.porDia} />
        )}

        {/* Agentes Especiais */}
        <TabelaAgentes senha={senha} />

        {/* Tabela */}
        <TabelaDenuncias senha={senha} />
      </main>
    </div>
  )
}
