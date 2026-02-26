export const EXPIRACAO_CURTA_MS = 60 * 60 * 1000          // 1h (padrao)
export const EXPIRACAO_LONGA_MS = 24 * 60 * 60 * 1000    // 24h (LIXO, OUTROS)
export const AVISO_CURTA_MS = 10 * 60 * 1000              // aviso nos últimos 10min
export const AVISO_LONGA_MS = 2 * 60 * 60 * 1000          // aviso nas últimas 2h
export const TIPOS_EXPIRACAO_LONGA: string[] = ['LIXO', 'OUTROS']
export const CENTRO_PRAIA_MORRO = [-20.6478, -40.4928] as const
