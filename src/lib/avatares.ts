export interface AvatarTier {
  emoji: string
  titulo: string
}

export const SPECIAL_AVATARS: Record<string, AvatarTier> = {
  poseidon: { emoji: '👑', titulo: 'Poseidon' },
  sereia: { emoji: '🧜‍♀️', titulo: 'Sereia' },
}

export function getAvatarTier(total: number): AvatarTier {
  if (total >= 50) return { emoji: '🔱', titulo: 'Guardião da Praia' }
  if (total >= 20) return { emoji: '🐋', titulo: 'Baleia' }
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
