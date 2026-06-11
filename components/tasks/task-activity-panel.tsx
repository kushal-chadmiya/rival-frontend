"use client"

import { useEffect, useState } from "react"
import {
  FileMinusIcon,
  FilePlusIcon,
  HistoryIcon,
  PencilIcon,
  PlusCircleIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchTaskActivity, priorityLabels, statusLabels } from "@/lib/api"
import type { Task, TaskActivity, TaskPriority, TaskStatus } from "@/lib/types"

const actionLabels: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  attachment_added: "Attachment added",
  attachment_removed: "Attachment removed",
}

const actionIcons: Record<string, typeof PencilIcon> = {
  created: PlusCircleIcon,
  updated: PencilIcon,
  deleted: Trash2Icon,
  attachment_added: FilePlusIcon,
  attachment_removed: FileMinusIcon,
}

const fieldChangeLabels: Record<string, string> = {
  title: "Title changed",
  description: "Description changed",
  status: "Status changed",
  priority: "Priority changed",
  due_date: "Due date changed",
}

type TaskActivityPanelProps = {
  task: Task
  accessToken: string
  compact?: boolean
}

export function TaskActivityPanel({ task, accessToken, compact = false }: TaskActivityPanelProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<TaskActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchTaskActivity(task.id, accessToken)
      .then((entries) => {
        if (!cancelled) {
          setItems(entries)
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load activity")
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, task.id, accessToken])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size={compact ? "icon-sm" : "sm"}
            title="Activity history"
            aria-label="Activity history"
          />
        }
      >
        <HistoryIcon {...(compact ? {} : { "data-icon": "inline-start" })} />
        {compact ? null : <span>History</span>}
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
          <DialogTitle>Activity history</DialogTitle>
          <DialogDescription>Changes recorded for &ldquo;{task.title}&rdquo;</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {items.map((entry) => (
                <ActivityItem key={entry.id} entry={entry} />
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ActivityItem({ entry }: { entry: TaskActivity }) {
  const Icon = actionIcons[entry.action] ?? PencilIcon
  const details = describeActivityDetails(entry)

  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">{actionLabels[entry.action] ?? entry.action}</p>
            <time className="shrink-0 text-xs text-muted-foreground">{formatWhen(entry.created_at)}</time>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {entry.actor_email || entry.actor_id}
          </p>
          {details.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1">
              {details.map((detail, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {detail}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function describeActivityDetails(entry: TaskActivity): string[] {
  const { action, changes } = entry

  if (action === "attachment_added" || action === "attachment_removed") {
    const fileName = changes.file_name
    return typeof fileName === "string" && fileName.trim() ? [fileName] : []
  }

  if (action === "created" || action === "deleted") {
    return []
  }

  const details: string[] = []

  for (const [key, value] of Object.entries(changes)) {
    if (key === "file_name") {
      if (typeof value === "string" && value.trim()) {
        details.push(value)
      }
      continue
    }

    const label = fieldChangeLabels[key]
    if (!label) {
      continue
    }

    if (key === "status" && isDelta(value)) {
      details.push(`Status changed to ${formatStatus(value.to)}`)
      continue
    }

    if (key === "priority" && isDelta(value)) {
      details.push(`Priority changed to ${formatPriority(value.to)}`)
      continue
    }

    details.push(label)
  }

  return details
}

function isDelta(value: unknown): value is { from?: unknown; to?: unknown } {
  return typeof value === "object" && value !== null && ("from" in value || "to" in value)
}

function formatStatus(value: unknown) {
  if (typeof value === "string" && value in statusLabels) {
    return statusLabels[value as TaskStatus]
  }

  return "updated"
}

function formatPriority(value: unknown) {
  if (typeof value === "string" && value in priorityLabels) {
    return priorityLabels[value as TaskPriority]
  }

  return "updated"
}

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
