export interface AvatarTier {
  emoji: string
  titulo: string
}

const SPECIAL_AVATARS: Record<string, AvatarTier> = {
  poseidon: { emoji: '👑', titulo: 'Poseidon' },
  sereia: { emoji: '🧜‍♀️', titulo: 'Sereia' },
}

const SPECIAL_ENV_KEYS: Record<string, string> = {
  POSEIDON_VISITOR_ID: 'poseidon',
  SEREIA_VISITOR_ID: 'sereia',
}

export function getSpecialAvatar(visitorId: string): AvatarTier | null {
  for (const [envKey, avatarKey] of Object.entries(SPECIAL_ENV_KEYS)) {
    const id = process.env[envKey]
    if (id && id === visitorId) return SPECIAL_AVATARS[avatarKey]
  }
  return null
}

export function getAvatarTier(total: number, visitorId?: string): AvatarTier {
  if (visitorId) {
    const special = getSpecialAvatar(visitorId)
    if (special) return special
  }
  if (total >= 50) return { emoji: '🔱', titulo: 'Guardião da Praia' }
  if (total >= 20) return { emoji: '🎣', titulo: 'Marlin Azul' }
  if (total >= 11) return { emoji: '🦈', titulo: 'Tubarão' }
  if (total >= 6) return { emoji: '🐬', titulo: 'Golfinho' }
  if (total >= 3) return { emoji: '🏄', titulo: 'Surfista' }
  if (total >= 1) return { emoji: '🐚', titulo: 'Coletor de Conchas' }
  return { emoji: '🏖️', titulo: 'Turista' }
}

// Todos os tiers (para preview no painel de testes)
export const TODOS_TIERS = [
  { total: 0, ...getAvatarTier(0) },
  { total: 1, ...getAvatarTier(1) },
  { total: 3, ...getAvatarTier(3) },
  { total: 6, ...getAvatarTier(6) },
  { total: 11, ...getAvatarTier(11) },
  { total: 20, ...getAvatarTier(20) },
  { total: 50, ...getAvatarTier(50) },
  { total: -1, ...SPECIAL_AVATARS.poseidon },
  { total: -1, ...SPECIAL_AVATARS.sereia },
]
