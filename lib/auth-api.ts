import type { StoredAuthSession } from "@/lib/auth-session"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

type Credentials = {
  email: string
  password: string
}

type AuthResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: {
    id: string
    email: string
  }
  message?: string
}

async function authRequest<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = (await response.json().catch(() => null)) as T & {
    error?: { message?: string }
    message?: string
  }

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Authentication failed")
  }

  return data
}

function toStoredSession(data: AuthResponse): StoredAuthSession {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  }
}

export async function login(credentials: Credentials) {
  const data = await authRequest<AuthResponse>("/auth/login", credentials)
  return toStoredSession(data)
}

export async function signup(credentials: Credentials) {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  })

  const data = (await response.json().catch(() => null)) as AuthResponse & {
    error?: { message?: string }
    message?: string
  }

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Signup failed")
  }

  if (response.status === 202 || !data.access_token) {
    throw new Error(data.message ?? "Account created. Confirm your email, then sign in.")
  }

  return toStoredSession(data)
}

export async function refreshSession(refreshToken: string) {
  const data = await authRequest<AuthResponse>("/auth/refresh", { refresh_token: refreshToken })
  return toStoredSession(data)
}
