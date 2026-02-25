export enum TipoDenuncia {
  SOM_ALTO = 'SOM_ALTO',
  DROGAS = 'DROGAS',
  ANIMAIS = 'ANIMAIS',
  LIXO = 'LIXO',
  AMBULANTE_IRREGULAR = 'AMBULANTE_IRREGULAR',
  OUTROS = 'OUTROS',
}

export interface Denuncia {
  id: string
  tipo: TipoDenuncia
  descricao: string | null
  latitude: number
  longitude: number
  sessionId: string
  criadoEm: string
}

export interface NovaDenuncia {
  tipo: TipoDenuncia
  descricao?: string
  latitude: number
  longitude: number
  sessionId: string
}

export const TIPO_CONFIG: Record<TipoDenuncia, { label: string; emoji: string; cor: string }> = {
  [TipoDenuncia.SOM_ALTO]: { label: 'Som Alto', emoji: '🔊', cor: '#e74c3c' },
  [TipoDenuncia.DROGAS]: { label: 'Drogas', emoji: '💊', cor: '#8e44ad' },
  [TipoDenuncia.ANIMAIS]: { label: 'Animais', emoji: '🐕', cor: '#f39c12' },
  [TipoDenuncia.LIXO]: { label: 'Lixo', emoji: '🗑️', cor: '#27ae60' },
  [TipoDenuncia.AMBULANTE_IRREGULAR]: { label: 'Ambulante Irregular', emoji: '🚫', cor: '#e67e22' },
  [TipoDenuncia.OUTROS]: { label: 'Outros', emoji: '⚠️', cor: '#95a5a6' },
}
