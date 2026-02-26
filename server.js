const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const next = require('next')
const { PrismaClient } = require('@prisma/client')

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const hostname = '0.0.0.0'
const EXPIRACAO_MINUTOS = 60              // 1 hora
const EXPIRACAO_LONGA_MINUTOS = 24 * 60   // 24 horas para LIXO e OUTROS
const TIPOS_EXPIRACAO_LONGA = ['LIXO', 'OUTROS']

const prisma = new PrismaClient()
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const expressApp = express()
  const httpServer = createServer(expressApp)

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  global.io = io

  io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`)
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`)
    })
  })

  // Limpeza automática de denúncias expiradas a cada 30 segundos
  setInterval(async () => {
    try {
      const limiteCurta = new Date(Date.now() - EXPIRACAO_MINUTOS * 60 * 1000)
      const limiteLonga = new Date(Date.now() - EXPIRACAO_LONGA_MINUTOS * 60 * 1000)

      // Buscar denúncias ativas que expiraram (por tipo)
      const expiradas = await prisma.denuncia.findMany({
        where: {
          ativa: true,
          OR: [
            { tipo: { notIn: TIPOS_EXPIRACAO_LONGA }, criadoEm: { lt: limiteCurta } },
            { tipo: { in: TIPOS_EXPIRACAO_LONGA }, criadoEm: { lt: limiteLonga } },
          ],
        },
        select: { id: true },
      })

      if (expiradas.length > 0) {
        const ids = expiradas.map((d) => d.id)

        // Soft delete — mantém no banco para contabilização
        await prisma.denuncia.updateMany({
          where: { id: { in: ids } },
          data: { ativa: false },
        })

        // Notificar todos os clientes para remover do mapa
        expiradas.forEach((d) => {
          io.emit('denuncia-removida', { id: d.id })
        })

        console.log(`Expiradas ${expiradas.length} denúncia(s)`)
      }

      // Limpar agentes inativos (sem update há 2 minutos)
      const limiteAgente = new Date(Date.now() - 2 * 60 * 1000)
      const agentesInativos = await prisma.agenteEspecial.findMany({
        where: { online: true, ultimoUpdate: { lt: limiteAgente } },
        select: { id: true },
      })

      if (agentesInativos.length > 0) {
        const idsAgentes = agentesInativos.map((a) => a.id)
        await prisma.agenteEspecial.updateMany({
          where: { id: { in: idsAgentes } },
          data: { online: false, latitude: null, longitude: null },
        })
        agentesInativos.forEach((a) => io.emit('agente-offline', { id: a.id }))
        console.log(`Agentes inativos: ${agentesInativos.length}`)
      }
    } catch (err) {
      console.error('Erro na limpeza automática:', err)
    }
  }, 30 * 1000)

  expressApp.all('*', (req, res) => {
    return handle(req, res)
  })

  httpServer.listen(port, hostname, () => {
    console.log(`> Praia10 rodando em http://${hostname}:${port}`)
    console.log(`> Socket.io pronto para conexões`)
    console.log(`> Denúncias expiram após ${EXPIRACAO_MINUTOS} minutos`)
  })
}).catch((err) => {
  console.error('Erro ao iniciar:', err)
  process.exit(1)
})
