import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleCheckIcon,
  Clock3Icon,
  ListTodoIcon,
  MinusIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { priorityLabels, statusLabels } from "@/lib/api"
import type { TaskPriority, TaskStatus } from "@/lib/types"

const statusStyles: Record<TaskStatus, { className: string; icon: typeof ListTodoIcon }> = {
  todo: {
    className: "border-border bg-muted text-muted-foreground dark:bg-muted/60",
    icon: ListTodoIcon,
  },
  in_progress: {
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
    icon: Clock3Icon,
  },
  completed: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    icon: CircleCheckIcon,
  },
}

const priorityStyles: Record<TaskPriority, { className: string; icon: typeof ArrowUpIcon }> = {
  low: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    icon: ArrowDownIcon,
  },
  medium: {
    className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    icon: MinusIcon,
  },
  high: {
    className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
    icon: ArrowUpIcon,
  },
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { className, icon: Icon } = statusStyles[status]

  return (
    <Badge variant="outline" className={className}>
      <Icon data-icon="inline-start" />
      {statusLabels[status]}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { className, icon: Icon } = priorityStyles[priority]

  return (
    <Badge variant="outline" className={className}>
      <Icon data-icon="inline-start" />
      {priorityLabels[priority]}
    </Badge>
  )
}
