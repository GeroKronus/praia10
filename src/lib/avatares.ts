export interface AvatarTier {
  emoji: string
  titulo: string
}

export function getAvatarTier(total: number): AvatarTier {
  if (total >= 21) return { emoji: '🔱', titulo: 'Guardião da Praia' }
  if (total >= 11) return { emoji: '🦈', titulo: 'Tubarão' }
  if (total >= 6) return { emoji: '🐬', titulo: 'Golfinho' }
  if (total >= 3) return { emoji: '🏄', titulo: 'Surfista' }
  if (total >= 1) return { emoji: '🐚', titulo: 'Coletor de Conchas' }
  return { emoji: '🏖️', titulo: 'Turista' }
}
