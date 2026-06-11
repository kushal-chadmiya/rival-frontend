"use client"

import { useEffect, useRef, useState } from "react"
import { FileIcon, PaperclipIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { deleteTaskAttachment, fetchTaskAttachments, uploadTaskAttachment } from "@/lib/api"
import type { TaskAttachment } from "@/lib/types"

type TaskFormAttachmentsProps = {
  accessToken: string
  taskId?: string
  disabled?: boolean
  pendingFiles: File[]
  onPendingFilesChange: (files: File[]) => void
}

export function TaskFormAttachments({
  accessToken,
  taskId,
  disabled,
  pendingFiles,
  onPendingFilesChange,
}: TaskFormAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<TaskAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) {
      setItems([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchTaskAttachments(taskId, accessToken)
      .then((attachments) => {
        if (!cancelled) {
          setItems(attachments)
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load attachments")
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
  }, [taskId, accessToken])

  async function handleSelectFile(file: File) {
    setError(null)

    if (taskId) {
      setUploading(true)
      try {
        const attachment = await uploadTaskAttachment(taskId, file, accessToken)
        setItems((current) => [attachment, ...current])
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Upload failed")
      } finally {
        setUploading(false)
      }
      return
    }

    onPendingFilesChange([...pendingFiles, file])
  }

  async function handleDeleteSaved(attachmentId: string) {
    if (!taskId) {
      return
    }

    setError(null)
    try {
      await deleteTaskAttachment(taskId, attachmentId, accessToken)
      setItems((current) => current.filter((item) => item.id !== attachmentId))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed")
    }
  }

  function handleRemovePending(index: number) {
    onPendingFilesChange(pendingFiles.filter((_, fileIndex) => fileIndex !== index))
  }

  const hasFiles = items.length > 0 || pendingFiles.length > 0

  return (
    <Field>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>Attachments</FieldLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          <PaperclipIcon data-icon="inline-start" />
          {uploading ? "Uploading..." : "Upload file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.txt"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              void handleSelectFile(file)
            }
            event.target.value = ""
          }}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading attachments...</p>
      ) : hasFiles ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              {item.mime_type.startsWith("image/") && item.download_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.download_url} alt={item.file_name} className="size-10 rounded object-cover" />
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => void handleDeleteSaved(item.id)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </li>
          ))}
          {pendingFiles.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)} · uploads on save</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => handleRemovePending(index)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Optional. Images, PDF, or text files.</p>
      )}
    </Field>
  )
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
