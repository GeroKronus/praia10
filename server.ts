import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import next from 'next'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev })
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

  // Tornar io acessível globalmente para as API routes
  ;(global as any).io = io

  io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`)

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`)
    })
  })

  // Todas as requisições passam pelo Next.js
  expressApp.all('*', (req: any, res: any) => {
    return handle(req, res)
  })

  httpServer.listen(port, () => {
    console.log(`> Praia10 rodando em http://localhost:${port}`)
    console.log(`> Socket.io pronto para conexões`)
  })
})
