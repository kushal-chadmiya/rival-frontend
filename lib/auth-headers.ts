import { loadViewRole } from "@/lib/view-role"

export function buildAuthHeaders(accessToken: string, extra?: HeadersInit): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "X-View-Role": loadViewRole(),
    ...extra,
  }
}
