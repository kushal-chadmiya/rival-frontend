"use client"

import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AuthPanel } from "@/components/tasks/auth-panel"
import { TaskDashboard } from "@/components/tasks/task-dashboard"
import { useAuth } from "@/hooks/use-auth"

export default function Home() {
  const {
    accessToken,
    canToggleAdmin,
    error,
    isAdmin,
    loading,
    session,
    setViewRole,
    signIn,
    signOut,
    signUp,
    user,
    viewRole,
  } = useAuth()
  const [busy, setBusy] = useState(false)

  async function wrap(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
        <p className="text-sm text-muted-foreground">Restoring your session...</p>
      </main>
    )
  }

  if (accessToken && session && user?.email) {
    return (
      <TaskDashboard
        accessToken={accessToken}
        userId={user.id}
        userEmail={user.email}
        isAdmin={isAdmin}
        canToggleAdmin={canToggleAdmin}
        viewRole={viewRole}
        onViewRoleChange={setViewRole}
        onSignOut={() => wrap(signOut)}
      />
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Task Manager</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to continue</h1>
      </div>

      <div className="w-full max-w-md">
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Authentication unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AuthPanel
          busy={busy || loading}
          onSignIn={(values) => wrap(() => signIn(values))}
          onSignUp={(values) => wrap(() => signUp(values))}
        />
      </div>
    </main>
  )
}
