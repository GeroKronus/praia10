'use client'

import { useState, useEffect } from 'react'
import { TODOS_TIERS } from '@/lib/avatares'

interface RankingItem {
  visitorId: string
  avatar: string
  titulo: string
  denuncias: number
  confirmacoes: number
  total: number
}

interface TestResult {
  label: string
  status: 'ok' | 'erro' | 'info'
  mensagem: string
}

// removido — usa TODOS_TIERS de avatares.ts

export default function TestesPage() {
  const [senha, setSenha] = useState('')
  const [autenticado, setAutenticado] = useState(false)
  const [erroLogin, setErroLogin] = useState(false)

  const [isDark, setIsDark] = useState(false)
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [logs, setLogs] = useState<TestResult[]>([])
  const [pushStats, setPushStats] = useState<{ total?: number; enviados?: number } | null>(null)

  const addLog = (label: string, status: TestResult['status'], mensagem: string) => {
    setLogs((prev) => [{ label, status, mensagem }, ...prev])
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroLogin(false)
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { 'x-admin-password': senha },
      })
      if (res.ok) {
        setAutenticado(true)
        sessionStorage.setItem('admin_test_pwd', senha)
      } else {
        setErroLogin(true)
      }
    } catch {
      setErroLogin(true)
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_test_pwd')
    if (saved) {
      setSenha(saved)
      setAutenticado(true)
    }
  }, [])

  const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-password': senha }

  // -- Test handlers --

  const testarVibracao = () => {
    if (navigator.vibrate) {
      navigator.vibrate(200)
      addLog('Vibração', 'ok', 'Vibração disparada (200ms)')
    } else {
      addLog('Vibração', 'info', 'navigator.vibrate não disponível neste dispositivo/navegador')
    }
  }

  const toggleDarkMode = () => {
    setIsDark((d) => !d)
    addLog('Modo escuro', 'ok', `Tema alternado para ${!isDark ? 'escuro' : 'claro'}`)
  }

  const testarCompartilhar = async () => {
    const texto = '🔊 Som Alto na Praia do Morro! Veja no Praia10: https://www.praia10.com.br/?lat=-20.6478&lng=-40.4928'
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Praia10', text: texto })
        addLog('Compartilhar', 'ok', 'Share nativo aberto')
      } catch {
        addLog('Compartilhar', 'info', 'Usuário cancelou o share')
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(texto)
      addLog('Compartilhar', 'ok', 'Link copiado para clipboard (share nativo não disponível)')
    } else {
      addLog('Compartilhar', 'erro', 'Nem share nem clipboard disponíveis')
    }
  }

  const criarDenunciaFake = async (qtd: number) => {
    try {
      const res = await fetch('/api/denuncias/fake', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ quantidade: qtd, visitorId: localStorage.getItem('praia10_visitor') }),
      })
      const data = await res.json()
      if (res.ok) {
        addLog('Denúncia fake', 'ok', `${data.criadas} denúncia(s) criada(s) — devem aparecer no mapa`)
      } else {
        addLog('Denúncia fake', 'erro', data.error || 'Erro ao criar')
      }
    } catch (err) {
      addLog('Denúncia fake', 'erro', String(err))
    }
  }

  const criarDenunciasPerto = async () => {
    try {
      const perto = { lat: -20.6478, lng: -40.4928 }
      // Criar 2 denúncias do mesmo tipo muito próximas (para testar proximidade)
      const res = await fetch('/api/denuncias/fake', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ quantidade: 2, visitorId: 'teste-proximidade', perto }),
      })
      const data = await res.json()
      if (res.ok) {
        addLog('Proximidade', 'ok', `${data.criadas} denúncias criadas próximas. Clique perto do centro do mapa para ver o banner de proximidade.`)
      } else {
        addLog('Proximidade', 'erro', data.error || 'Erro')
      }
    } catch (err) {
      addLog('Proximidade', 'erro', String(err))
    }
  }

  const buscarRanking = async () => {
    try {
      const res = await fetch('/api/ranking')
      const data = await res.json()
      if (Array.isArray(data)) {
        setRanking(data)
        addLog('Ranking', 'ok', `${data.length} colaboradores encontrados`)
      } else {
        addLog('Ranking', 'erro', data.error || 'Resposta inesperada')
      }
    } catch (err) {
      addLog('Ranking', 'erro', String(err))
    }
  }

  const testarPush = async () => {
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: adminHeaders,
      })
      const data = await res.json()
      if (res.ok) {
        setPushStats(data)
        addLog('Push', 'ok', `Enviado para ${data.enviados}/${data.total} subscriptions (${data.falhas} falhas, ${data.removidas} removidas)`)
      } else {
        addLog('Push', 'erro', data.error || 'Erro ao enviar')
      }
    } catch (err) {
      addLog('Push', 'erro', String(err))
    }
  }

  const verificarPWA = () => {
    const checks: string[] = []
    checks.push(`Service Worker: ${'serviceWorker' in navigator ? 'Suportado' : 'Não suportado'}`)
    checks.push(`Notification API: ${'Notification' in window ? `Sim (${Notification.permission})` : 'Não'}`)
    checks.push(`Standalone: ${window.matchMedia('(display-mode: standalone)').matches ? 'Sim (PWA instalada)' : 'Não (navegador)'}`)
    checks.push(`VAPID key: ${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'Configurada' : 'NÃO configurada'}`)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        addLog('PWA', reg ? 'ok' : 'info', checks.join(' | ') + ` | SW registrado: ${reg ? 'Sim' : 'Não'}`)
      })
    } else {
      addLog('PWA', 'info', checks.join(' | '))
    }
  }

  // Login
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🧪</div>
            <h1 className="text-2xl font-bold text-gray-800">Painel de Testes</h1>
            <p className="text-sm text-gray-500 mt-1">Senha de admin necessária</p>
          </div>
          <input
            type="password"
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setErroLogin(false) }}
            placeholder="Senha..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {erroLogin && <p className="text-red-500 text-sm mb-4 text-center">Senha incorreta.</p>}
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">Entrar</button>
        </form>
      </div>
    )
  }

  const statusIcon = (s: TestResult['status']) => s === 'ok' ? '✅' : s === 'erro' ? '❌' : 'ℹ️'

  return (
    <div className={`admin-testes-page min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors`}>
      <div className="max-w-2xl mx-auto p-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">🧪 Painel de Testes</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Testar todas as features</p>
          </div>
          <a href="/" className={`text-sm px-3 py-1.5 rounded-lg ${isDark ? 'bg-gray-800 text-blue-400' : 'bg-white text-blue-600 shadow'}`}>
            Ir ao Mapa
          </a>
        </div>

        {/* Seções de teste */}
        <div className="space-y-4">

          {/* 1. Vibração */}
          <Section title="1. Vibração" emoji="📳" isDark={isDark}>
            <p className="text-sm mb-3 opacity-70">Testa navigator.vibrate (só funciona no celular)</p>
            <button onClick={testarVibracao} className="btn-test bg-purple-600">
              Vibrar (200ms)
            </button>
          </Section>

          {/* 2. Modo Escuro */}
          <Section title="2. Modo Escuro" emoji="🌙" isDark={isDark}>
            <p className="text-sm mb-3 opacity-70">
              Automático: escuro 18h–6h. Hora atual: {new Date().getHours()}h.
              Noturno: {new Date().getHours() >= 18 || new Date().getHours() < 6 ? 'Sim' : 'Não'}
            </p>
            <button onClick={toggleDarkMode} className={`btn-test ${isDark ? 'bg-yellow-500' : 'bg-gray-700'}`}>
              {isDark ? '☀️ Forçar claro' : '🌙 Forçar escuro'}
            </button>
          </Section>

          {/* 3. Compartilhar */}
          <Section title="3. Compartilhar" emoji="📤" isDark={isDark}>
            <p className="text-sm mb-3 opacity-70">Testa Web Share API (mobile) ou clipboard (desktop)</p>
            <button onClick={testarCompartilhar} className="btn-test bg-green-600">
              Compartilhar denúncia teste
            </button>
          </Section>

          {/* 4. Proximidade */}
          <Section title="4. Proximidade (50m)" emoji="📍" isDark={isDark}>
            <p className="text-sm mb-3 opacity-70">
              Cria 2 denúncias próximas ao centro. Depois, no mapa, clique perto e escolha o mesmo tipo — deve aparecer o banner &quot;Eu também!&quot;
            </p>
            <button onClick={criarDenunciasPerto} className="btn-test bg-amber-600">
              Criar par de denúncias próximas
            </button>
          </Section>

          {/* 5. Ranking + Avatares */}
          <Section title="5. Ranking + Avatares" emoji="🏆" isDark={isDark}>
            {/* Seu visitorId */}
            <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-blue-50 border border-blue-200'}`}>
              <p className="text-xs font-semibold mb-1 opacity-70">Seu visitorId (copie para configurar avatar especial):</p>
              <code className={`text-xs break-all select-all ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                {typeof window !== 'undefined' ? localStorage.getItem('praia10_visitor') || 'não encontrado' : '...'}
              </code>
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold mb-2 opacity-70">Todos os tiers:</p>
              <div className="grid grid-cols-2 gap-2">
                {TODOS_TIERS.map((tier, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className="text-2xl">{tier.emoji}</span>
                    <div>
                      <p className="text-xs font-bold">{tier.titulo}</p>
                      <p className="text-[10px] opacity-50">{tier.total >= 0 ? `${tier.total}+ contribuições` : 'Especial'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <button onClick={buscarRanking} className="btn-test bg-blue-600">
                Buscar ranking real
              </button>
              <button onClick={() => criarDenunciaFake(3)} className="btn-test bg-indigo-600">
                +3 fakes (seu visitor)
              </button>
            </div>
            {ranking.length > 0 && (
              <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-white shadow'}`}>
                <div className={`px-3 py-2 text-xs font-bold ${isDark ? 'bg-gray-600' : 'bg-gray-100'}`}>
                  Top {ranking.length} colaboradores
                </div>
                {ranking.map((r, i) => {
                  const medals = ['🥇', '🥈', '🥉']
                  const isMe = r.visitorId === (typeof window !== 'undefined' ? localStorage.getItem('praia10_visitor') : null)
                  return (
                    <div key={r.visitorId} className={`flex items-center gap-2 px-3 py-2 border-t ${isDark ? 'border-gray-600' : 'border-gray-100'} ${isMe ? (isDark ? 'bg-blue-900/30' : 'bg-blue-50') : ''}`}>
                      <span className="w-5 text-center text-sm">{i < 3 ? medals[i] : i + 1}</span>
                      <span className="text-lg">{r.avatar}</span>
                      <div className="flex-1">
                        <span className="text-xs font-medium">{isMe ? 'Você' : `#${r.visitorId.substring(0, 4).toUpperCase()}`}</span>
                        <span className="text-[10px] opacity-50 ml-1">{r.titulo}</span>
                      </div>
                      <span className="text-xs opacity-50">{r.denuncias}d {r.confirmacoes}c</span>
                      <span className="text-sm font-bold text-blue-500">{r.total}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* 6. PWA + Push */}
          <Section title="6. PWA + Push" emoji="🔔" isDark={isDark}>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={verificarPWA} className="btn-test bg-teal-600">
                Verificar status PWA
              </button>
              <button onClick={testarPush} className="btn-test bg-red-600">
                Enviar push de teste
              </button>
            </div>
            {pushStats && (
              <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
                Subscriptions: {pushStats.total} | Enviados: {pushStats.enviados}
              </div>
            )}
          </Section>

          {/* 7. Denúncias Fake */}
          <Section title="Criar Denúncias Fake" emoji="🎭" isDark={isDark}>
            <p className="text-sm mb-3 opacity-70">Popula o mapa com denúncias de teste (visíveis para todos, expiram normalmente)</p>
            <div className="flex gap-2">
              <button onClick={() => criarDenunciaFake(1)} className="btn-test bg-orange-600">+1</button>
              <button onClick={() => criarDenunciaFake(3)} className="btn-test bg-orange-600">+3</button>
              <button onClick={() => criarDenunciaFake(5)} className="btn-test bg-orange-600">+5</button>
              <button onClick={() => criarDenunciaFake(10)} className="btn-test bg-orange-600">+10</button>
            </div>
          </Section>

          {/* Log */}
          {logs.length > 0 && (
            <Section title="Log" emoji="📋" isDark={isDark}>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className={`text-xs p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className="mr-1">{statusIcon(log.status)}</span>
                    <span className="font-bold mr-1">[{log.label}]</span>
                    <span className="opacity-80">{log.mensagem}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setLogs([])} className="text-xs mt-2 opacity-50 hover:opacity-100">
                Limpar log
              </button>
            </Section>
          )}
        </div>
      </div>

      <style jsx global>{`
        .btn-test {
          padding: 8px 16px;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          transition: opacity 0.2s;
          border: none;
          cursor: pointer;
        }
        .btn-test:hover { opacity: 0.85; }
        .btn-test:active { opacity: 0.7; }
      `}</style>
    </div>
  )
}

function Section({ title, emoji, isDark, children }: { title: string; emoji: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
      <h2 className="text-base font-bold mb-3">{emoji} {title}</h2>
      {children}
    </div>
  )
}
