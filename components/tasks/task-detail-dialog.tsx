"use client"

import { useEffect, useState } from "react"
import { CalendarIcon, FileIcon, PaperclipIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { PriorityBadge, StatusBadge } from "@/components/tasks/task-badges"
import { fetchTaskAttachments } from "@/lib/api"
import type { Task, TaskAttachment } from "@/lib/types"

type TaskDetailDialogProps = {
  task: Task
  accessToken: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailDialog({ task, accessToken, open, onOpenChange }: TaskDetailDialogProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    setLoadingAttachments(true)

    fetchTaskAttachments(task.id, accessToken)
      .then((items) => {
        if (!cancelled) {
          setAttachments(items)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAttachments([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAttachments(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, task.id, accessToken])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 space-y-3 border-b px-6 py-5 pr-12">
          <DialogTitle className="text-xl leading-snug">{task.title}</DialogTitle>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <DialogDescription className="sr-only">Task details</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Description</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {task.description.trim() || "No description provided."}
              </p>
            </section>

            <Separator />

            <section className="grid gap-3 sm:grid-cols-2">
              <DetailItem icon={CalendarIcon} label="Due date" value={formatDate(task.due_date)} />
              <DetailItem icon={CalendarIcon} label="Created" value={formatDate(task.created_at)} />
            </section>

            {(loadingAttachments || attachments.length > 0) && (
              <>
                <Separator />
                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <PaperclipIcon className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Attachments</h3>
                  </div>
                  {loadingAttachments ? (
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {attachments.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5"
                        >
                          {item.mime_type.startsWith("image/") && item.download_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.download_url}
                              alt={item.file_name}
                              className="size-10 rounded object-cover"
                            />
                          ) : (
                            <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0 flex-1">
                            {item.download_url ? (
                              <a
                                href={item.download_url}
                                className="truncate text-sm font-medium hover:underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                {item.file_name}
                              </a>
                            ) : (
                              <p className="truncate text-sm font-medium">{item.file_name}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{formatBytes(item.size_bytes)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarIcon
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
