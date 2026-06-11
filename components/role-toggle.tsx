"use client"

import { ShieldIcon, UserIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ViewRole } from "@/lib/view-role"

type RoleToggleProps = {
  value: ViewRole
  onChange: (role: ViewRole) => void
  disabled?: boolean
}

export function RoleToggle({ value, onChange, disabled }: RoleToggleProps) {
  return (
    <div
      className="flex items-center rounded-lg border bg-background p-0.5"
      role="group"
      aria-label="Switch role view"
    >
      <Button
        type="button"
        variant={value === "user" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 gap-1 px-2"
        disabled={disabled}
        aria-pressed={value === "user"}
        onClick={() => onChange("user")}
      >
        <UserIcon className="size-3.5" />
        <span className="hidden sm:inline">User</span>
      </Button>
      <Button
        type="button"
        variant={value === "admin" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 gap-1 px-2"
        disabled={disabled}
        aria-pressed={value === "admin"}
        onClick={() => onChange("admin")}
      >
        <ShieldIcon className="size-3.5" />
        <span className="hidden sm:inline">Admin</span>
      </Button>
    </div>
  )
}
