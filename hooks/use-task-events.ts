"use client"

import { useEffect } from "react"

import { API_BASE } from "@/lib/api"
import type { Task, TaskEvent } from "@/lib/types"
import type { ViewRole } from "@/lib/view-role"

type UseTaskEventsOptions = {
  accessToken: string | null
  viewRole: ViewRole
  onEvent: (event: TaskEvent) => void
}

export function useTaskEvents({ accessToken, viewRole, onEvent }: UseTaskEventsOptions) {
  useEffect(() => {
    if (!accessToken) {
      return
    }

    const params = new URLSearchParams({
      access_token: accessToken,
      view_role: viewRole,
    })

    const source = new EventSource(`${API_BASE}/tasks/events?${params.toString()}`)

    source.addEventListener("task", (message) => {
      try {
        const event = JSON.parse(message.data) as TaskEvent
        onEvent(event)
      } catch {
        // ignore malformed events
      }
    })

    source.onerror = () => {
      source.close()
    }

    return () => {
      source.close()
    }
  }, [accessToken, onEvent, viewRole])
}

export function mergeTaskEvent(tasks: Task[], event: TaskEvent): Task[] {
  switch (event.type) {
    case "task.created":
      if (!event.task) {
        return tasks
      }
      if (tasks.some((task) => task.id === event.task!.id)) {
        return tasks
      }
      const optimisticIndex = tasks.findIndex((task) => task.id.startsWith("temp-"))
      if (optimisticIndex !== -1) {
        return tasks.map((task, index) => (index === optimisticIndex ? event.task! : task))
      }
      return [event.task, ...tasks]
    case "task.updated":
      if (!event.task) {
        return tasks
      }
      return tasks.map((task) => (task.id === event.task!.id ? event.task! : task))
    case "task.deleted":
      return tasks.filter((task) => task.id !== event.task_id)
    default:
      return tasks
  }
}
