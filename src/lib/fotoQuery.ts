import { NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaModel = any

export async function buscarFoto(model: PrismaModel, id: string): Promise<NextResponse> {
  const registro = await model.findUnique({
    where: { id },
    select: { fotoBase64: true },
  })
  if (!registro || !registro.fotoBase64) {
    return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
  }
  return NextResponse.json({ fotoBase64: registro.fotoBase64 })
}

export async function adicionarTemFoto<T extends { id: string }>(
  model: PrismaModel,
  registros: T[]
): Promise<(T & { temFoto: boolean })[]> {
  const ids = registros.map((r) => r.id)
  const comFoto = await model.findMany({
    where: { id: { in: ids }, fotoBase64: { not: null } },
    select: { id: true },
  })
  const idsComFoto = new Set(comFoto.map((r: { id: string }) => r.id))
  return registros.map((r) => ({ ...r, temFoto: idsComFoto.has(r.id) }))
}

export function semFoto<T extends { fotoBase64?: string | null }>(
  obj: T
): Omit<T, 'fotoBase64'> & { temFoto: boolean } {
  const { fotoBase64, ...rest } = obj
  return { ...rest, temFoto: !!fotoBase64 }
}
