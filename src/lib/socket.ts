import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      transports: ['polling', 'websocket'],
    })
  }
  return socket
}
