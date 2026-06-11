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
