"use client"

import { useEffect, useState } from "react"

import * as authApi from "@/lib/auth-api"
import {
  AUTH_SESSION_STORAGE_KEY,
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  type StoredAuthSession,
} from "@/lib/auth-session"
import {
  clearViewRole,
  getOrInitViewRole,
  loadViewRole,
  saveViewRole,
  type ViewRole,
} from "@/lib/view-role"

type Credentials = {
  email: string
  password: string
}

export class AlreadySignedInError extends Error {
  email: string

  constructor(email: string) {
    super(`Already signed in as ${email}. Sign out before using another account.`)
    this.name = "AlreadySignedInError"
    this.email = email
  }
}

export function useAuth() {
  const [session, setSession] = useState<StoredAuthSession | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [canToggleAdmin, setCanToggleAdmin] = useState(false)
  const [viewRole, setViewRoleState] = useState<ViewRole>("user")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadProfile(accessToken: string, initializeRole = false) {
    try {
      if (initializeRole) {
        const bootstrap = await authApi.fetchProfile(accessToken)
        getOrInitViewRole(bootstrap.actual_role ?? bootstrap.role)
      }

      const profile = await authApi.fetchProfile(accessToken)
      setViewRoleState(loadViewRole())
      setIsAdmin(profile.is_admin)
      setCanToggleAdmin(profile.can_toggle_admin ?? false)
    } catch {
      setIsAdmin(false)
      setCanToggleAdmin(false)
    }
  }

  async function applySession(nextSession: StoredAuthSession, initializeRole = false) {
    setSession(nextSession)
    await loadProfile(nextSession.accessToken, initializeRole)
    setError(null)
  }

  function setViewRole(role: ViewRole) {
    saveViewRole(role)
    setViewRoleState(role)
    if (session) {
      void loadProfile(session.accessToken)
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
            setCanToggleAdmin(false)
            setLoading(false)
          }
          return
        }
      }

      if (!cancelled) {
        await applySession(active, true)
        setLoading(false)
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key !== AUTH_SESSION_STORAGE_KEY) {
        return
      }

      if (!event.newValue) {
        setSession(null)
        setIsAdmin(false)
        setCanToggleAdmin(false)
        return
      }

      try {
        const nextSession = JSON.parse(event.newValue) as StoredAuthSession
        void applySession(nextSession, true)
      } catch {
        setSession(null)
        setIsAdmin(false)
        setCanToggleAdmin(false)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  function resolveExistingSession(requestedEmail: string) {
    const existing = loadAuthSession()
    if (!existing) {
      return null
    }

    if (existing.user.email.toLowerCase() === requestedEmail.toLowerCase()) {
      return existing
    }

    throw new AlreadySignedInError(existing.user.email)
  }

  async function signIn(credentials: Credentials) {
    const existing = resolveExistingSession(credentials.email)
    if (existing) {
      await applySession(existing, true)
      return
    }

    const nextSession = await authApi.login(credentials)
    saveAuthSession(nextSession)
    await applySession(nextSession, true)
  }

  async function signUp(credentials: Credentials) {
    const existing = resolveExistingSession(credentials.email)
    if (existing) {
      await applySession(existing, true)
      return
    }

    const nextSession = await authApi.signup(credentials)
    saveAuthSession(nextSession)
    await applySession(nextSession, true)
  }

  async function signOut() {
    clearAuthSession()
    clearViewRole()
    setSession(null)
    setIsAdmin(false)
    setCanToggleAdmin(false)
    setViewRoleState("user")
  }

  return {
    session,
    user: session?.user ?? null,
    loading,
    error,
    isAdmin,
    canToggleAdmin,
    viewRole,
    setViewRole,
    accessToken: session?.accessToken ?? null,
    signIn,
    signUp,
    signOut,
  }
}
