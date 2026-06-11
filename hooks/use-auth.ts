"use client"

import { useEffect, useState } from "react"

import * as authApi from "@/lib/auth-api"
import { clearAuthSession, loadAuthSession, saveAuthSession, type StoredAuthSession } from "@/lib/auth-session"

type Credentials = {
  email: string
  password: string
}

export function useAuth() {
  const [session, setSession] = useState<StoredAuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const stored = loadAuthSession()
      if (!stored) {
        if (!cancelled) {
          setLoading(false)
        }
        return
      }

      if (stored.expiresAt > Date.now() + 60_000) {
        if (!cancelled) {
          setSession(stored)
          setLoading(false)
        }
        return
      }

      try {
        const refreshed = await authApi.refreshSession(stored.refreshToken)
        saveAuthSession(refreshed)
        if (!cancelled) {
          setSession(refreshed)
        }
      } catch {
        clearAuthSession()
        if (!cancelled) {
          setSession(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  async function signIn(credentials: Credentials) {
    const nextSession = await authApi.login(credentials)
    saveAuthSession(nextSession)
    setSession(nextSession)
    setError(null)
  }

  async function signUp(credentials: Credentials) {
    const nextSession = await authApi.signup(credentials)
    saveAuthSession(nextSession)
    setSession(nextSession)
    setError(null)
  }

  async function signOut() {
    clearAuthSession()
    setSession(null)
  }

  return {
    session,
    user: session?.user ?? null,
    loading,
    error,
    accessToken: session?.accessToken ?? null,
    signIn,
    signUp,
    signOut,
  }
}
