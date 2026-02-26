import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth-dashboard'
import { TIPO_CONFIG, Denuncia } from '@/types'
import { SETORES, getSetorDenuncia } from '@/lib/setores'

export async function GET(request: Request) {
  const authError = verificarAdmin(request)
  if (authError) return authError

  try {
    const agora = new Date()
    const inicioHoje = new Date(agora)
    inicioHoje.setHours(0, 0, 0, 0)

    const inicioSemana = new Date(agora)
    inicioSemana.setDate(inicioSemana.getDate() - 7)

    // Total hoje
    const totalHoje = await prisma.denuncia.count({
      where: { criadoEm: { gte: inicioHoje } },
    })

    // Total semana
    const totalSemana = await prisma.denuncia.count({
      where: { criadoEm: { gte: inicioSemana } },
    })

    // Ativas agora (ativa=true e dentro do período de expiração de 10 min)
    const limiteExpiracao = new Date(Date.now() - 10 * 60 * 1000)
    const ativasAgora = await prisma.denuncia.count({
      where: { ativa: true, criadoEm: { gte: limiteExpiracao } },
    })

    // Resolvidas hoje
    const resolvidasHoje = await prisma.denuncia.count({
      where: { resolvidoEm: { gte: inicioHoje } },
    })

    // Por tipo (todas, não apenas ativas)
    const porTipoRaw = await prisma.denuncia.groupBy({
      by: ['tipo'],
      _count: { id: true },
    })
    const porTipo = porTipoRaw.map((r) => {
      const config = TIPO_CONFIG[r.tipo as keyof typeof TIPO_CONFIG]
      return {
        tipo: r.tipo,
        label: config?.label || r.tipo,
        total: r._count.id,
        cor: config?.cor || '#95a5a6',
      }
    })

    // Por hora (últimas 24h)
    const inicio24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const denuncias24h = await prisma.denuncia.findMany({
      where: { criadoEm: { gte: inicio24h } },
      select: { criadoEm: true },
    })
    const horaMap = new Map<number, number>()
    for (let h = 0; h < 24; h++) horaMap.set(h, 0)
    denuncias24h.forEach((d) => {
      const h = new Date(d.criadoEm).getHours()
      horaMap.set(h, (horaMap.get(h) || 0) + 1)
    })
    const porHora = Array.from(horaMap.entries()).map(([hora, total]) => ({ hora, total }))

    // Por dia (últimos 7 dias)
    const denunciasSemana = await prisma.denuncia.findMany({
      where: { criadoEm: { gte: inicioSemana } },
      select: { criadoEm: true },
    })
    const diaMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(agora)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      diaMap.set(key, 0)
    }
    denunciasSemana.forEach((d) => {
      const key = new Date(d.criadoEm).toISOString().slice(0, 10)
      if (diaMap.has(key)) diaMap.set(key, (diaMap.get(key) || 0) + 1)
    })
    const porDia = Array.from(diaMap.entries()).map(([dia, total]) => ({ dia, total }))

    // Por setor
    const todasDenuncias = await prisma.denuncia.findMany({
      select: { latitude: true, longitude: true },
    })
    const setorMap = new Map<string, number>()
    SETORES.forEach((s) => setorMap.set(s.nome, 0))
    todasDenuncias.forEach((d) => {
      const setor = getSetorDenuncia(d as Denuncia)
      if (setor) setorMap.set(setor.nome, (setorMap.get(setor.nome) || 0) + 1)
    })
    const porSetor = Array.from(setorMap.entries()).map(([setor, total]) => ({ setor, total }))

    // Visitantes únicos hoje
    const hojeStr = agora.toISOString().slice(0, 10)
    const visitantesHoje = await prisma.visita.count({
      where: { data: hojeStr },
    })

    // Visitantes únicos últimos 7 dias
    const diasSemana: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(agora)
      d.setDate(d.getDate() - i)
      diasSemana.push(d.toISOString().slice(0, 10))
    }
    const visitantesSemana = await prisma.visita.count({
      where: { data: { in: diasSemana } },
    })

    // Visitantes por dia (últimos 7 dias)
    const visitasPorDiaRaw = await prisma.visita.groupBy({
      by: ['data'],
      _count: { id: true },
      where: { data: { in: diasSemana } },
    })
    const visitasDiaMap = new Map<string, number>()
    visitasPorDiaRaw.forEach((v) => visitasDiaMap.set(v.data, v._count.id))

    // Merge visitantes into porDia
    const porDiaComVisitantes = porDia.map((d) => ({
      ...d,
      visitantes: visitasDiaMap.get(d.dia) || 0,
    }))

    return NextResponse.json({
      totalHoje,
      totalSemana,
      ativasAgora,
      resolvidasHoje,
      porTipo,
      porHora,
      porDia: porDiaComVisitantes,
      porSetor,
      visitantesHoje,
      visitantesSemana,
    })
  } catch (error) {
    console.error('Erro ao buscar stats:', error)
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 })
  }
}
