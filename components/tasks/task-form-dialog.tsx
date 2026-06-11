"use client"

import { FormEvent, useState, type ReactNode } from "react"
import { format } from "date-fns"
import { CalendarIcon, ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { priorityLabels, statusLabels } from "@/lib/api"
import type { Task, TaskFormValues, TaskPriority, TaskStatus } from "@/lib/types"

const statusItems = [
  { label: statusLabels.todo, value: "todo" },
  { label: statusLabels.in_progress, value: "in_progress" },
  { label: statusLabels.completed, value: "completed" },
] as const

const priorityItems = [
  { label: priorityLabels.low, value: "low" },
  { label: priorityLabels.medium, value: "medium" },
  { label: priorityLabels.high, value: "high" },
] as const

const initialValues: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
}

type TaskFormDialogProps = {
  busy: boolean
  task?: Task
  triggerLabel: string
  triggerIcon?: ReactNode
  onSubmit: (values: TaskFormValues) => Promise<void>
}

export function TaskFormDialog({ busy, task, triggerLabel, triggerIcon, onSubmit }: TaskFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<TaskFormValues>(() => taskToFormValues(task))
  const [dueDate, setDueDate] = useState<Date | undefined>(() => parseDueDate(taskToFormValues(task).dueDate).date)
  const [dueTime, setDueTime] = useState(() => parseDueDate(taskToFormValues(task).dueDate).time)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function syncDueDate(date: Date | undefined, time: string) {
    setDueDate(date)
    setDueTime(time)
    setValues((current) => ({
      ...current,
      dueDate: date ? toDateTimeLocal(date, time) : "",
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!values.title.trim()) {
      setError("A title is required.")
      return
    }
    if (!values.dueDate) {
      setError("Choose a due date.")
      return
    }

    setError(null)

    try {
      await onSubmit(values)
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save task")
    }
  }

  function updateField<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function resetForm(nextTask?: Task) {
    const nextValues = taskToFormValues(nextTask)
    const parsedDueDate = parseDueDate(nextValues.dueDate)

    setValues(nextValues)
    setDueDate(parsedDueDate.date)
    setDueTime(parsedDueDate.time)
    setError(null)
    setCalendarOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          resetForm(task)
        } else {
          setError(null)
          setCalendarOpen(false)
        }
      }}
    >
      <DialogTrigger render={<Button variant={task ? "outline" : "default"} size={task ? "sm" : "default"} />}>
        {triggerIcon}
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <DialogTitle className="text-xl">{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update the details below." : "Add a title, due date, and optional details."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6 px-6 py-6">
            <FieldGroup className="gap-5">
              <Field data-invalid={Boolean(error && !values.title.trim())}>
                <FieldLabel htmlFor="task-title">Title</FieldLabel>
                <Input
                  id="task-title"
                  value={values.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  aria-invalid={Boolean(error && !values.title.trim())}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="task-description">Description</FieldLabel>
                <Textarea
                  id="task-description"
                  rows={4}
                  value={values.description}
                  onChange={(event) => updateField("description", event.target.value)}
                />
              </Field>
            </FieldGroup>

            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  items={statusItems}
                  value={values.status}
                  onValueChange={(nextValue) => updateField("status", nextValue as TaskStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {statusItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Priority</FieldLabel>
                <Select
                  items={priorityItems}
                  value={values.priority}
                  onValueChange={(nextValue) => updateField("priority", nextValue as TaskPriority)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {priorityItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <FieldGroup className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <Field data-invalid={Boolean(error && !values.dueDate)}>
                <FieldLabel htmlFor="task-due-date">Due date</FieldLabel>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        id="task-due-date"
                        data-empty={!dueDate}
                        className="h-8 w-full items-center gap-2 px-2.5 font-normal shadow-none data-[empty=true]:text-muted-foreground"
                        aria-invalid={Boolean(error && !values.dueDate)}
                      />
                    }
                  >
                    <CalendarIcon data-icon="inline-start" />
                    <span className="flex-1 truncate text-left">
                      {dueDate ? format(dueDate, "MMM d, yyyy") : "Select date"}
                    </span>
                    <ChevronDownIcon className="text-muted-foreground" data-icon="inline-end" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      defaultMonth={dueDate}
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        syncDueDate(date, dueTime)
                        setCalendarOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field data-invalid={Boolean(error && !values.dueDate)}>
                <FieldLabel htmlFor="task-due-time">Time</FieldLabel>
                <Input
                  id="task-due-time"
                  type="time"
                  step={60}
                  className="appearance-none bg-background tabular-nums [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                  value={dueTime}
                  onChange={(event) => syncDueDate(dueDate, event.target.value)}
                  aria-invalid={Boolean(error && !values.dueDate)}
                />
              </Field>
            </FieldGroup>

            {error ? <FieldError>{error}</FieldError> : null}
          </div>

          <DialogFooter className="mx-0 mb-0 gap-3 rounded-b-xl border-t bg-background px-6 py-5">
            <Button type="submit" disabled={busy} className="min-w-32">
              {busy ? "Saving..." : task ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function taskToFormValues(task?: Task): TaskFormValues {
  if (!task) {
    return initialValues
  }

  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date.slice(0, 16),
  }
}

function parseDueDate(value: string) {
  if (!value) {
    return { date: undefined, time: "09:00" }
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return { date: undefined, time: "09:00" }
  }

  const time = `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`

  return { date: parsed, time }
}

function toDateTimeLocal(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map((part) => Number(part))
  const combined = new Date(date)
  combined.setHours(hours ?? 0, minutes ?? 0, 0, 0)

  const year = combined.getFullYear()
  const month = String(combined.getMonth() + 1).padStart(2, "0")
  const day = String(combined.getDate()).padStart(2, "0")
  const hour = String(combined.getHours()).padStart(2, "0")
  const minute = String(combined.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hour}:${minute}`
}
