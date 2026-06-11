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
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadProfile(accessToken: string) {
    try {
      const profile = await authApi.fetchProfile(accessToken)
      setIsAdmin(profile.is_admin)
    } catch {
      setIsAdmin(false)
    }
  }

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

      let active = stored
      if (stored.expiresAt <= Date.now() + 60_000) {
        try {
          active = await authApi.refreshSession(stored.refreshToken)
          saveAuthSession(active)
        } catch {
          clearAuthSession()
          if (!cancelled) {
            setSession(null)
            setIsAdmin(false)
            setLoading(false)
          }
          return
        }
      }

      if (!cancelled) {
        setSession(active)
        await loadProfile(active.accessToken)
        setLoading(false)
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
    await loadProfile(nextSession.accessToken)
    setError(null)
  }

  async function signUp(credentials: Credentials) {
    const nextSession = await authApi.signup(credentials)
    saveAuthSession(nextSession)
    setSession(nextSession)
    await loadProfile(nextSession.accessToken)
    setError(null)
  }

  async function signOut() {
    clearAuthSession()
    setSession(null)
    setIsAdmin(false)
  }

  return {
    session,
    user: session?.user ?? null,
    loading,
    error,
    isAdmin,
    accessToken: session?.accessToken ?? null,
    signIn,
    signUp,
    signOut,
  }
}
