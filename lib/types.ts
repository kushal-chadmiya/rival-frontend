export type TaskStatus = "todo" | "in_progress" | "completed"
export type TaskPriority = "low" | "medium" | "high"

export type Task = {
  id: string
  user_id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string
  created_at: string
  updated_at: string
}

export type TaskListResponse = {
  items: Task[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export type TaskFormValues = {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
}

export type TaskActivity = {
  id: string
  task_id: string
  actor_id: string
  actor_email: string
  action: string
  changes: Record<string, unknown>
  created_at: string
}

export type TaskAttachment = {
  id: string
  task_id: string
  user_id: string
  file_name: string
  mime_type: string
  size_bytes: number
  storage_path: string
  download_url?: string
  created_at: string
}

export type TaskEvent = {
  type: "task.created" | "task.updated" | "task.deleted"
  task?: Task
  task_id: string
}

export type UserProfile = {
  user_id: string
  email: string
  role: string
  is_admin: boolean
}
