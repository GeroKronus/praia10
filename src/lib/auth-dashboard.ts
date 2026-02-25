import { NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fiscalizacao2024'

export function verificarAdmin(request: Request): NextResponse | null {
  const senha = request.headers.get('x-admin-password')
  if (senha !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  return null
}
