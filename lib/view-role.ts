export type ViewRole = "admin" | "user"

export const VIEW_ROLE_STORAGE_KEY = "taskboard_view_role"

export function loadViewRole(): ViewRole {
  if (typeof window === "undefined") {
    return "user"
  }

  const stored = window.localStorage.getItem(VIEW_ROLE_STORAGE_KEY)
  if (stored === "admin" || stored === "user") {
    return stored
  }

  return "user"
}

export function getOrInitViewRole(actualRole: string): ViewRole {
  if (typeof window === "undefined") {
    return actualRole === "admin" ? "admin" : "user"
  }

  const stored = window.localStorage.getItem(VIEW_ROLE_STORAGE_KEY)
  if (stored === "admin" || stored === "user") {
    return stored
  }

  const initial: ViewRole = actualRole === "admin" ? "admin" : "user"
  saveViewRole(initial)
  return initial
}

export function saveViewRole(role: ViewRole) {
  window.localStorage.setItem(VIEW_ROLE_STORAGE_KEY, role)
}

export function clearViewRole() {
  window.localStorage.removeItem(VIEW_ROLE_STORAGE_KEY)
}
