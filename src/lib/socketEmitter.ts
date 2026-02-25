export function emitSocket(event: string, payload: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const io = (global as any).io
  if (io) {
    io.emit(event, payload)
  }
}
