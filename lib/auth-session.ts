export type StoredAuthSession = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: {
    id: string
    email: string
  }
}

export const AUTH_SESSION_STORAGE_KEY = "taskboard_auth_session"

export function saveAuthSession(session: StoredAuthSession) {
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
  window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
}

export function loadAuthSession(): StoredAuthSession | null {
  const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as StoredAuthSession
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    return null
  }
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
  window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
}
