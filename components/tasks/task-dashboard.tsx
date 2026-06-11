"use client"

import { startTransition, useCallback, useDeferredValue, useEffect, useState } from "react"
import {
  CheckCheckIcon,
  CircleAlertIcon,
  EyeIcon,
  ListTodoIcon,
  LogOutIcon,
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
import { ThemeToggle } from "@/components/theme-toggle"
import { PriorityBadge, StatusBadge } from "@/components/tasks/task-badges"
import { TaskActivityPanel } from "@/components/tasks/task-activity-panel"
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog"
import { TaskFormDialog } from "@/components/tasks/task-form-dialog"
import { mergeTaskEvent, useTaskEvents } from "@/hooks/use-task-events"
import { createTask, deleteTask, fetchTasks, markTaskComplete, priorityLabels, statusLabels, updateTask } from "@/lib/api"
import type { Task, TaskFormValues, TaskPriority, TaskStatus } from "@/lib/types"

type TaskDashboardProps = {
  accessToken: string
  userId: string
  userEmail: string
  isAdmin?: boolean
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

function buildOptimisticTask(values: TaskFormValues, userId: string): Task {
  const now = new Date().toISOString()
  return {
    id: `temp-${crypto.randomUUID()}`,
    user_id: userId,
    title: values.title,
    description: values.description,
    status: values.status,
    priority: values.priority,
    due_date: new Date(values.dueDate).toISOString(),
    created_at: now,
    updated_at: now,
  }
}

export function TaskDashboard({ accessToken, userId, userEmail, isAdmin = false, onSignOut }: TaskDashboardProps) {
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

  const handleRealtimeEvent = useCallback((event: Parameters<typeof mergeTaskEvent>[1]) => {
    setTasks((current) => mergeTaskEvent(current, event))
  }, [])

  useTaskEvents({ accessToken, onEvent: handleRealtimeEvent })

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
    const snapshot = tasks
    const optimistic = buildOptimisticTask(values, userId)
    setMutating(true)
    setTasks((current) => [optimistic, ...current])
    startTransition(() => setPage(1))

    try {
      const created = await createTask(values, accessToken)
      setTasks((current) => current.map((task) => (task.id === optimistic.id ? created : task)))
      toast.success("Task created", { description: values.title })
      return created
    } catch (createError) {
      setTasks(snapshot)
      setError(createError instanceof Error ? createError.message : "Unable to create task")
      throw createError
    } finally {
      setMutating(false)
    }
  }

  async function handleUpdate(taskId: string, values: TaskFormValues) {
    const snapshot = tasks
    setMutating(true)
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title: values.title,
              description: values.description,
              status: values.status,
              priority: values.priority,
              due_date: new Date(values.dueDate).toISOString(),
            }
          : task,
      ),
    )

    try {
      const updated = await updateTask(taskId, values, accessToken)
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)))
      toast.success("Task updated", { description: values.title })
    } catch (updateError) {
      setTasks(snapshot)
      setError(updateError instanceof Error ? updateError.message : "Unable to update task")
      throw updateError
    } finally {
      setMutating(false)
    }
  }

  async function handleComplete(taskId: string, title: string) {
    const snapshot = tasks
    setMutating(true)
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: "completed" } : task)))

    try {
      const updated = await markTaskComplete(taskId, accessToken)
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)))
      toast.success("Task completed", { description: title })
    } catch (completeError) {
      setTasks(snapshot)
      setError(completeError instanceof Error ? completeError.message : "Unable to complete task")
    } finally {
      setMutating(false)
    }
  }

  async function handleDelete(taskId: string, title: string) {
    const snapshot = tasks
    setMutating(true)
    setTasks((current) => current.filter((task) => task.id !== taskId))

    try {
      await deleteTask(taskId, accessToken)
      toast.success("Task deleted", { description: title })
    } catch (deleteError) {
      setTasks(snapshot)
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete task")
      throw deleteError
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
            {isAdmin ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Admin view
              </Badge>
            ) : null}
            <ThemeToggle />
            <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
            <TaskFormDialog
              busy={mutating}
              accessToken={accessToken}
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
            <h1 className="text-2xl font-semibold tracking-tight">{isAdmin ? "All tasks" : "Your tasks"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin ? "Viewing all users' tasks · " : ""}
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
              accessToken={accessToken}
              triggerLabel="Create task"
              triggerIcon={<PlusIcon data-icon="inline-start" />}
              onSubmit={handleCreate}
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <div
              className={`hidden border-b bg-muted/40 px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid sm:items-center sm:gap-4 ${isAdmin ? "sm:grid-cols-[minmax(0,1fr)_88px_132px_112px_auto]" : "sm:grid-cols-[minmax(0,1fr)_132px_112px_auto]"}`}
            >
              <span>Task</span>
              {isAdmin ? <span>Owner</span> : null}
              <span>Status</span>
              <span>Priority</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  accessToken={accessToken}
                  isAdmin={isAdmin}
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
  accessToken,
  isAdmin,
  mutating,
  onComplete,
  onDelete,
  onUpdate,
}: {
  task: Task
  accessToken: string
  isAdmin: boolean
  mutating: boolean
  onComplete: () => void
  onDelete: () => Promise<void>
  onUpdate: (values: TaskFormValues) => Promise<void>
}) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const gridCols = isAdmin
    ? "sm:grid-cols-[minmax(0,1fr)_88px_132px_112px_auto]"
    : "sm:grid-cols-[minmax(0,1fr)_132px_112px_auto]"

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
    <>
      <div className={`group px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid sm:items-center sm:gap-4 ${gridCols}`}>
        <button
          type="button"
          className="min-w-0 rounded-md text-left transition-colors hover:bg-muted/50 sm:py-1"
          onClick={() => setDetailOpen(true)}
        >
          <p className="truncate font-medium group-hover:text-foreground">{task.title}</p>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {task.description || "No description"}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Due {formatDate(task.due_date)} · Created {formatDate(task.created_at)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 sm:hidden">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </button>

        {isAdmin ? (
          <div className="hidden truncate text-xs text-muted-foreground sm:block" title={task.user_id}>
            {task.user_id.slice(0, 8)}…
          </div>
        ) : null}

        <div className="hidden sm:flex sm:justify-start">
          <StatusBadge status={task.status} />
        </div>

        <div className="hidden sm:flex sm:justify-start">
          <PriorityBadge priority={task.priority} />
        </div>

        <div className="mt-3 flex items-center justify-end gap-1 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            title="View details"
            onClick={() => setDetailOpen(true)}
          >
            <EyeIcon data-icon="inline-start" />
            <span className="sr-only sm:not-sr-only">View</span>
          </Button>
          <TaskActivityPanel task={task} accessToken={accessToken} />
          <TaskFormDialog
            busy={mutating}
            accessToken={accessToken}
            triggerLabel="Edit"
            task={task}
            onSubmit={onUpdate}
          />
          <Button
            variant="outline"
            size="sm"
            title="Mark complete"
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
              title="Delete task"
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
      </div>

      <TaskDetailDialog
        task={task}
        accessToken={accessToken}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
