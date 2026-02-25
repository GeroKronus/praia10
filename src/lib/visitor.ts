const KEY = 'praia10_visitor'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 ano

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

/**
 * Retorna o visitorId do usuário, sincronizando cookie ↔ localStorage.
 * Cookie é a fonte principal (compartilhado entre browser e PWA).
 */
export function getVisitorId(): string {
  const fromCookie = getCookie(KEY)
  const fromStorage = localStorage.getItem(KEY)

  // Cookie tem prioridade (compartilhado entre contextos)
  const id = fromCookie || fromStorage || crypto.randomUUID()

  // Sincronizar ambos
  if (!fromCookie || (fromCookie !== id)) setCookie(KEY, id)
  if (!fromStorage || fromStorage !== id) localStorage.setItem(KEY, id)

  return id
}
