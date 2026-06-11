"use client"

import { startTransition, useDeferredValue, useEffect, useState } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  Clock3Icon,
  ListTodoIcon,
  LogOutIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { createTask, deleteTask, fetchTasks, markTaskComplete, priorityLabels, statusLabels, updateTask } from "@/lib/api"
import type { Task, TaskFormValues, TaskPriority, TaskStatus } from "@/lib/types"
import { TaskFormDialog } from "@/components/tasks/task-form-dialog"

type TaskDashboardProps = {
  accessToken: string
  userEmail: string
  onSignOut: () => Promise<void>
}

const statusFilterItems = [
  { label: "All statuses", value: "all" },
  { label: statusLabels.todo, value: "todo" },
  { label: statusLabels.in_progress, value: "in_progress" },
  { label: statusLabels.completed, value: "completed" },
] as const

const sortItems = [
  { label: "Newest first", value: "created_at:desc" },
  { label: "Oldest first", value: "created_at:asc" },
  { label: "Nearest due date", value: "due_date:asc" },
  { label: "Highest priority", value: "priority:desc" },
] as const

export function TaskDashboard({ accessToken, userEmail, onSignOut }: TaskDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<TaskStatus | "all">("all")
  const [sortBy, setSortBy] = useState<"created_at" | "due_date" | "priority">("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(8)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadTasks() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetchTasks(
          {
            status,
            search: deferredSearch,
            sortBy,
            sortDir,
            page,
            pageSize,
          },
          accessToken,
        )

        if (!cancelled) {
          setTasks(response.items)
          setTotalPages(response.total_pages)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load tasks")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadTasks()

    return () => {
      cancelled = true
    }
  }, [accessToken, deferredSearch, page, pageSize, sortBy, sortDir, status])

  async function refreshTasks() {
    const response = await fetchTasks(
      {
        status,
        search: deferredSearch,
        sortBy,
        sortDir,
        page,
        pageSize,
      },
      accessToken,
    )

    setTasks(response.items)
    setTotalPages(response.total_pages)
  }

  async function handleCreate(values: TaskFormValues) {
    setMutating(true)
    try {
      await createTask(values, accessToken)
      startTransition(() => {
        setPage(1)
      })
      await refreshTasks()
      toast.success("Task created", {
        description: values.title,
      })
    } finally {
      setMutating(false)
    }
  }

  async function handleUpdate(taskId: string, values: TaskFormValues) {
    setMutating(true)
    try {
      await updateTask(taskId, values, accessToken)
      await refreshTasks()
      toast.success("Task updated", {
        description: values.title,
      })
    } finally {
      setMutating(false)
    }
  }

  async function handleComplete(taskId: string, title: string) {
    setMutating(true)
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: "completed" } : task)))

    try {
      await markTaskComplete(taskId, accessToken)
      await refreshTasks()
      toast.success("Task completed", {
        description: title,
      })
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Unable to complete task")
      await refreshTasks()
    } finally {
      setMutating(false)
    }
  }

  async function handleDelete(taskId: string, title: string) {
    setMutating(true)

    try {
      await deleteTask(taskId, accessToken)
      await refreshTasks()
      toast.success("Task deleted", {
        description: title,
      })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete task")
    } finally {
      setMutating(false)
    }
  }

  const completedCount = tasks.filter((task) => task.status === "completed").length

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ListTodoIcon className="size-4" />
            </div>
            <span className="font-semibold tracking-tight">Tasks</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
            <TaskFormDialog
              busy={mutating}
              triggerLabel="New task"
              triggerIcon={<PlusIcon data-icon="inline-start" />}
              onSubmit={handleCreate}
            />
            <Button variant="outline" size="sm" onClick={() => void onSignOut()} disabled={mutating}>
              <LogOutIcon data-icon="inline-start" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tasks.length} showing · {completedCount} completed on this page
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-lg border bg-card p-4">
          <FieldGroup className="gap-4 md:grid md:grid-cols-4">
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="search">Search</FieldLabel>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  className="pl-10"
                  placeholder="Search by title..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    startTransition(() => {
                      setPage(1)
                    })
                  }}
                />
              </div>
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select
                items={statusFilterItems}
                value={status}
                onValueChange={(nextValue) => {
                  setStatus(nextValue as TaskStatus | "all")
                  startTransition(() => {
                    setPage(1)
                  })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {statusFilterItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Sort by</FieldLabel>
              <Select
                items={sortItems}
                value={`${sortBy}:${sortDir}`}
                onValueChange={(value) => {
                  if (!value) {
                    return
                  }

                  const [nextSortBy, nextSortDir] = value.split(":") as [
                    "created_at" | "due_date" | "priority",
                    "asc" | "desc",
                  ]
                  setSortBy(nextSortBy)
                  setSortDir(nextSortDir)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {sortItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-6">
            <CircleAlertIcon />
            <AlertTitle>Unable to complete action</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="divide-y rounded-lg border bg-card">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="ml-auto h-5 w-20" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-card px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <ListTodoIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">No tasks found</p>
              <p className="text-sm text-muted-foreground">
                {search || status !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create a task to get started."}
              </p>
            </div>
            <TaskFormDialog
              busy={mutating}
              triggerLabel="Create task"
              triggerIcon={<PlusIcon data-icon="inline-start" />}
              onSubmit={handleCreate}
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="hidden border-b bg-muted/40 px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid sm:grid-cols-[1fr_148px_120px_200px] sm:gap-4">
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  mutating={mutating}
                  onComplete={() => void handleComplete(task.id, task.title)}
                  onDelete={() => handleDelete(task.id, task.title)}
                  onUpdate={(values) => handleUpdate(task.id, values)}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && tasks.length > 0 ? (
          <>
            <Separator className="my-6" />
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {Math.max(totalPages, 1)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || page >= Math.max(totalPages, 1)}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}

function TaskRow({
  task,
  mutating,
  onComplete,
  onDelete,
  onUpdate,
}: {
  task: Task
  mutating: boolean
  onComplete: () => void
  onDelete: () => Promise<void>
  onUpdate: (values: TaskFormValues) => Promise<void>
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      await onDelete()
      setDeleteOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="group px-4 py-4 transition-colors hover:bg-muted/30 sm:grid sm:grid-cols-[1fr_148px_120px_200px] sm:items-center sm:gap-4">
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium">{task.title}</p>
        <p className="truncate text-sm text-muted-foreground">
          {task.description || "No description"}
        </p>
        <p className="text-xs text-muted-foreground sm:hidden">
          Due {formatDate(task.due_date)}
        </p>
        <div className="flex flex-wrap gap-2 pt-1 sm:hidden">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      <div className="hidden sm:block">
        <StatusBadge status={task.status} />
      </div>

      <div className="hidden sm:block">
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 sm:mt-0">
        <TaskFormDialog
          busy={mutating}
          triggerLabel="Edit"
          task={task}
          onSubmit={onUpdate}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={mutating || task.status === "completed"}
          onClick={onComplete}
        >
          <CheckCheckIcon data-icon="inline-start" />
          <span className="sr-only sm:not-sr-only">Complete</span>
        </Button>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Button
            variant="destructive"
            size="sm"
            disabled={mutating || deleting}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon data-icon="inline-start" />
            <span className="sr-only sm:not-sr-only">Delete</span>
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this task?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{task.title}&rdquo; will be permanently removed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
              >
                {deleting ? "Deleting..." : "Delete task"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <p className="mt-2 hidden text-xs text-muted-foreground sm:col-span-4 sm:mt-0 sm:block">
        Due {formatDate(task.due_date)} · Created {formatDate(task.created_at)}
      </p>
    </div>
  )
}

const statusStyles: Record<TaskStatus, { className: string; icon: typeof ListTodoIcon }> = {
  todo: {
    className: "border-slate-200 bg-slate-100 text-slate-700",
    icon: ListTodoIcon,
  },
  in_progress: {
    className: "border-blue-200 bg-blue-50 text-blue-700",
    icon: Clock3Icon,
  },
  completed: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CircleCheckIcon,
  },
}

const priorityStyles: Record<TaskPriority, { className: string; icon: typeof ArrowUpIcon }> = {
  low: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: ArrowDownIcon,
  },
  medium: {
    className: "border-amber-200 bg-amber-50 text-amber-800",
    icon: MinusIcon,
  },
  high: {
    className: "border-rose-200 bg-rose-50 text-rose-700",
    icon: ArrowUpIcon,
  },
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const { className, icon: Icon } = statusStyles[status]

  return (
    <Badge variant="outline" className={className}>
      <Icon data-icon="inline-start" />
      {statusLabels[status]}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { className, icon: Icon } = priorityStyles[priority]

  return (
    <Badge variant="outline" className={className}>
      <Icon data-icon="inline-start" />
      {priorityLabels[priority]}
    </Badge>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
