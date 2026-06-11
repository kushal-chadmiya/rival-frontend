export type StoredAuthSession = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: {
    id: string
    email: string
  }
}

const STORAGE_KEY = "taskboard_auth_session"

export function saveAuthSession(session: StoredAuthSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function loadAuthSession(): StoredAuthSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as StoredAuthSession
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function clearAuthSession() {
  window.localStorage.removeItem(STORAGE_KEY)
}
