import { buildAuthHeaders } from "@/lib/auth-headers"
import type {
  Task,
  TaskActivity,
  TaskAttachment,
  TaskFormValues,
  TaskListResponse,
  TaskPriority,
  TaskStatus,
  UserProfile,
} from "@/lib/types"

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

type TaskQuery = {
  status: TaskStatus | "all"
  search: string
  sortBy: "created_at" | "due_date" | "priority"
  sortDir: "asc" | "desc"
  page: number
  pageSize: number
}

async function request<T>(path: string, init: RequestInit, accessToken: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: buildAuthHeaders(accessToken, {
      "Content-Type": "application/json",
      ...init.headers,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message = data?.error?.message ?? "Request failed"
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function fetchTasks(query: TaskQuery, accessToken: string) {
  const params = new URLSearchParams({
    page: String(query.page),
    page_size: String(query.pageSize),
    sort_by: query.sortBy,
    sort_dir: query.sortDir,
  })

  if (query.status !== "all") {
    params.set("status", query.status)
  }
  if (query.search.trim()) {
    params.set("search", query.search.trim())
  }

  return request<TaskListResponse>(`/tasks?${params.toString()}`, { method: "GET" }, accessToken)
}

export async function createTask(values: TaskFormValues, accessToken: string) {
  return request<Task>(
    "/tasks",
    {
      method: "POST",
      body: JSON.stringify({
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        due_date: new Date(values.dueDate).toISOString(),
      }),
    },
    accessToken,
  )
}

export async function updateTask(taskId: string, values: Partial<TaskFormValues>, accessToken: string) {
  return request<Task>(
    `/tasks/${taskId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        ...(values.title !== undefined ? { title: values.title } : {}),
        ...(values.description !== undefined ? { description: values.description } : {}),
        ...(values.status !== undefined ? { status: values.status } : {}),
        ...(values.priority !== undefined ? { priority: values.priority } : {}),
        ...(values.dueDate !== undefined ? { due_date: new Date(values.dueDate).toISOString() } : {}),
      }),
    },
    accessToken,
  )
}

export async function deleteTask(taskId: string, accessToken: string) {
  return request<void>(`/tasks/${taskId}`, { method: "DELETE" }, accessToken)
}

export async function markTaskComplete(taskId: string, accessToken: string) {
  return updateTask(taskId, { status: "completed" }, accessToken)
}

export async function fetchMe(accessToken: string) {
  return request<UserProfile>("/auth/me", { method: "GET" }, accessToken)
}

export async function fetchTaskActivity(taskId: string, accessToken: string) {
  const data = await request<{ items: TaskActivity[] }>(`/tasks/${taskId}/activity`, { method: "GET" }, accessToken)
  return data.items
}

export async function fetchTaskAttachments(taskId: string, accessToken: string) {
  const data = await request<{ items: TaskAttachment[] }>(
    `/tasks/${taskId}/attachments`,
    { method: "GET" },
    accessToken,
  )
  return data.items
}

export async function uploadTaskAttachment(taskId: string, file: File, accessToken: string) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE}/tasks/${taskId}/attachments`, {
    method: "POST",
    headers: buildAuthHeaders(accessToken),
    body: formData,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error?.message ?? "Upload failed")
  }

  return response.json() as Promise<TaskAttachment>
}

export async function deleteTaskAttachment(taskId: string, attachmentId: string, accessToken: string) {
  return request<void>(`/tasks/${taskId}/attachments/${attachmentId}`, { method: "DELETE" }, accessToken)
}

export const sortLabels: Record<TaskQuery["sortBy"], string> = {
  created_at: "Created date",
  due_date: "Due date",
  priority: "Priority",
}

export const statusLabels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  completed: "Completed",
}

export const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}
