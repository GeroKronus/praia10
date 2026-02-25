export enum TipoDenuncia {
  SOM_ALTO = 'SOM_ALTO',
  DROGAS = 'DROGAS',
  ANIMAIS = 'ANIMAIS',
  LIXO = 'LIXO',
  AMBULANTE_IRREGULAR = 'AMBULANTE_IRREGULAR',
  CRIANCA_PERDIDA = 'CRIANCA_PERDIDA',
  OUTROS = 'OUTROS',
}

export interface Denuncia {
  id: string
  tipo: TipoDenuncia
  descricao: string | null
  latitude: number
  longitude: number
  sessionId: string
  temFoto: boolean
  confirmacoes: number
  criadoEm: string
  resolvidoEm: string | null
  resolvidoPor: string | null
}

export interface DenunciaCompleta extends Denuncia {
  fotoBase64: string | null
}

export interface NovaDenuncia {
  tipo: TipoDenuncia
  descricao?: string
  latitude: number
  longitude: number
  sessionId: string
  fotoBase64?: string
}

export interface DashboardStats {
  totalHoje: number
  totalSemana: number
  ativasAgora: number
  resolvidasHoje: number
  porTipo: { tipo: string; label: string; total: number; cor: string }[]
  porHora: { hora: number; total: number }[]
  porDia: { dia: string; total: number; visitantes: number }[]
  porSetor: { setor: string; total: number }[]
  visitantesHoje: number
  visitantesSemana: number
}

export const TIPO_CONFIG: Record<TipoDenuncia, { label: string; emoji: string; cor: string }> = {
  [TipoDenuncia.SOM_ALTO]: { label: 'Som Alto', emoji: '🔊', cor: '#e74c3c' },
  [TipoDenuncia.DROGAS]: { label: 'Drogas', emoji: '💊', cor: '#8e44ad' },
  [TipoDenuncia.ANIMAIS]: { label: 'Animais', emoji: '🐕', cor: '#f39c12' },
  [TipoDenuncia.LIXO]: { label: 'Lixo', emoji: '🗑️', cor: '#27ae60' },
  [TipoDenuncia.AMBULANTE_IRREGULAR]: { label: 'Ambulante Irregular', emoji: '🚫', cor: '#e67e22' },
  [TipoDenuncia.CRIANCA_PERDIDA]: { label: 'Criança Perdida', emoji: '👶', cor: '#e84393' },
  [TipoDenuncia.OUTROS]: { label: 'Outros', emoji: '⚠️', cor: '#95a5a6' },
}

// POIs (Pontos de Interesse)
export enum TipoPOI {
  QUIOSQUE = 'QUIOSQUE',
  SALVA_VIDAS = 'SALVA_VIDAS',
  POLICIA = 'POLICIA',
  BANHEIRO = 'BANHEIRO',
  CHUVEIRO = 'CHUVEIRO',
  ESTACIONAMENTO = 'ESTACIONAMENTO',
  INFORMACAO = 'INFORMACAO',
  EVENTO = 'EVENTO',
}

export const POI_CONFIG: Record<TipoPOI, { label: string; emoji: string; cor: string }> = {
  [TipoPOI.QUIOSQUE]: { label: 'Quiosque', emoji: '🏪', cor: '#e67e22' },
  [TipoPOI.SALVA_VIDAS]: { label: 'Salva-vidas', emoji: '🏊', cor: '#e74c3c' },
  [TipoPOI.POLICIA]: { label: 'Polícia', emoji: '🚔', cor: '#2c3e50' },
  [TipoPOI.BANHEIRO]: { label: 'Banheiro', emoji: '🚻', cor: '#27ae60' },
  [TipoPOI.CHUVEIRO]: { label: 'Chuveiro', emoji: '🚿', cor: '#00bcd4' },
  [TipoPOI.ESTACIONAMENTO]: { label: 'Estacionamento', emoji: '🅿️', cor: '#7f8c8d' },
  [TipoPOI.INFORMACAO]: { label: 'Informação', emoji: 'ℹ️', cor: '#3498db' },
  [TipoPOI.EVENTO]: { label: 'Evento', emoji: '🎉', cor: '#9b59b6' },
}

export interface POI {
  id: string
  tipo: TipoPOI
  nome: string | null
  descricao: string | null
  latitude: number
  longitude: number
  criadoEm: string
}
