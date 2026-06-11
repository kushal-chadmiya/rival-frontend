import type { Task, TaskFormValues, TaskListResponse, TaskPriority, TaskStatus } from "@/lib/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
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
