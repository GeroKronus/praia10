const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const hostname = '0.0.0.0'

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

  expressApp.all('*', (req, res) => {
    return handle(req, res)
  })

  httpServer.listen(port, hostname, () => {
    console.log(`> Praia10 rodando em http://${hostname}:${port}`)
    console.log(`> Socket.io pronto para conexões`)
  })
}).catch((err) => {
  console.error('Erro ao iniciar:', err)
  process.exit(1)
})
