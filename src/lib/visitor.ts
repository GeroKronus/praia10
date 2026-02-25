const KEY = 'praia10_visitor'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 ano

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

function setVisitorId(id: string) {
  setCookie(KEY, id)
  localStorage.setItem(KEY, id)
}

/**
 * Retorna o visitorId do usuário, sincronizando cookie ↔ localStorage.
 * Quando ambos existem e diferem, retorna localStorage sem sincronizar —
 * reconcileVisitorId() resolve o conflito de forma assíncrona via servidor.
 */
export function getVisitorId(): string {
  const fromCookie = getCookie(KEY)
  const fromStorage = localStorage.getItem(KEY)

  // Ambos iguais → OK
  if (fromCookie && fromStorage && fromCookie === fromStorage) return fromCookie

  // Só cookie → adotar (PWA lendo cookie do browser)
  if (fromCookie && !fromStorage) {
    localStorage.setItem(KEY, fromCookie)
    return fromCookie
  }

  // Só localStorage → setar cookie
  if (!fromCookie && fromStorage) {
    setCookie(KEY, fromStorage)
    return fromStorage
  }

  // Ambos existem e diferem → retornar localStorage, NÃO sincronizar
  // reconcileVisitorId() vai resolver via servidor
  if (fromCookie && fromStorage) return fromStorage

  // Nenhum → gerar novo
  const id = crypto.randomUUID()
  setVisitorId(id)
  return id
}

/**
 * Resolve conflito entre cookie e localStorage verificando claims no servidor.
 * Retorna true se houve mudança (caller deve recarregar a página).
 */
export async function reconcileVisitorId(): Promise<boolean> {
  const fromCookie = getCookie(KEY)
  const fromStorage = localStorage.getItem(KEY)

  if (!fromCookie || !fromStorage || fromCookie === fromStorage) return false

  try {
    const storageRes = await fetch(`/api/avatar/status?visitorId=${fromStorage}`).then((r) => r.json())
    const storageHasClaim = Array.isArray(storageRes) && storageRes.some((a: { meu: boolean }) => a.meu)

    // Quem tem claim ganha; senão → cookie (compartilhado entre contextos)
    const winnerId = storageHasClaim ? fromStorage : fromCookie
    setVisitorId(winnerId)
    return true
  } catch {
    return false
  }
}
