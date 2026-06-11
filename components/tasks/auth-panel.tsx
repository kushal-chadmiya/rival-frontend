"use client"

import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type AuthMode = "login" | "signup"

type AuthPanelProps = {
  busy: boolean
  onSignIn: (values: { email: string; password: string }) => Promise<void>
  onSignUp: (values: { email: string; password: string }) => Promise<void>
}

export function AuthPanel({ busy, onSignIn, onSignUp }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim() || password.length < 8) {
      setError("Enter a valid email and a password with at least 8 characters.")
      return
    }

    setError(null)

    try {
      if (mode === "login") {
        await onSignIn({ email, password })
      } else {
        await onSignUp({ email, password })
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "login" ? "Sign in" : "Create account"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                autoComplete="email"
              />
            </Field>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(error)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>

          <div className="flex flex-col gap-3">
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login")
                setError(null)
              }}
            >
              {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
