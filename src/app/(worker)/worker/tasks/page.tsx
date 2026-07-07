"use client"

import { useCallback, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { taskKeys } from "@/lib/supabase/query-keys"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import type { Task } from "@/types/database"
import { TASK_STATUS } from "@/lib/constants"

interface TaskRow extends Task {
  projects: { name: string }
}

export default function WorkerTasksPage() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const user = useAuthStore((s) => s.user)

  const [detailTask, setDetailTask] = useState<TaskRow | null>(null)

  const { data: tasks, isLoading, isError, error } = useQuery({
    queryKey: taskKeys.list({ worker_id: user?.id } as Record<string, unknown>),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, task_assignments!inner(*), projects(name)")
        .eq("task_assignments.worker_id", user!.id)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as unknown as TaskRow[]
    },
    enabled: !!user?.id,
  })

  const [updating, setUpdating] = useState<string | null>(null)

  const updateStatus = useCallback(async (taskId: string, newStatus: string) => {
    setUpdating(taskId)
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus } as never)
      .eq("id", taskId)
    setUpdating(null)

    if (error) {
      toast.error("Failed to update task status")
      return
    }

    toast.success("Task status updated")
    queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    queryClient.invalidateQueries({ queryKey: ["worker", "today-tasks"] })
  }, [supabase, queryClient])

  const columns: ColumnDef<TaskRow>[] = useMemo(() => [
    {
      accessorKey: "title",
      header: "Task",
      cell: ({ row }) => (
        <button
          onClick={() => setDetailTask(row.original)}
          className="text-left"
        >
          <p className="font-medium hover:underline">{row.original.title}</p>
          {row.original.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</p>
          )}
        </button>
      ),
    },
    {
      accessorKey: "projects",
      header: "Project",
      cell: ({ getValue }) => {
        const p = getValue() as { name: string } | undefined
        return p?.name ?? "-"
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ getValue }) => (
        <StatusBadge type="taskPriority" value={getValue() as string} />
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Select
            value={status}
            onValueChange={(v) => v && updateStatus(row.original.id, v)}
            disabled={updating === row.original.id}
          >
            <SelectTrigger className="h-8 w-36">
              <SelectValue>
                <StatusBadge type="taskStatus" value={status} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TASK_STATUS.PENDING}>Pending</SelectItem>
              <SelectItem value={TASK_STATUS.IN_PROGRESS}>In Progress</SelectItem>
              <SelectItem value={TASK_STATUS.COMPLETED}>Completed</SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      accessorKey: "deadline",
      header: "Deadline",
      cell: ({ getValue }) => {
        const d = getValue() as string | null
        return d ? new Date(d).toLocaleDateString() : "-"
      },
    },
  ], [updating, updateStatus])

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description="View and update your assigned tasks"
      />

      <DataTable
        columns={columns}
        data={tasks}
        isLoading={isLoading}
        isError={isError}
        errorMessage={(error as Error)?.message}
        onRetry={() => queryClient.invalidateQueries({ queryKey: taskKeys.lists() })}
        searchKey="title"
        searchPlaceholder="Search tasks..."
        emptyState={{
          title: "No tasks assigned",
          description: "You haven't been assigned any tasks yet. Your manager will assign tasks as needed.",
        }}
      />

      <Dialog open={!!detailTask} onOpenChange={(open) => { if (!open) setDetailTask(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{detailTask?.title}</DialogTitle>
            <DialogDescription>
              {detailTask?.projects?.name}
            </DialogDescription>
          </DialogHeader>
          {detailTask && (
            <div className="space-y-4">
              {detailTask.description && (
                <div>
                  <Label>Description</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{detailTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <StatusBadge type="taskStatus" value={detailTask.status} />
                  </div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <div className="mt-1">
                    <StatusBadge type="taskPriority" value={detailTask.priority} />
                  </div>
                </div>
              </div>
              <div>
                <Label>Deadline</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detailTask.deadline ? new Date(detailTask.deadline).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTask(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
