"use client"

import { useState, useMemo, useEffect, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { taskKeys, workerKeys, projectKeys } from "@/lib/supabase/query-keys"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PlusIcon, PencilIcon, Trash2Icon, CheckIcon, ChevronsUpDownIcon, EyeIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import type { Task, TaskAssignment } from "@/types/database"
import { TASK_STATUS, TASK_PRIORITY } from "@/lib/constants"

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  project_id: z.string().min(1, "Project is required"),
  status: z.string().optional(),
  priority: z.string().optional(),
  deadline: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskRow extends Task {
  task_assignments: TaskAssignment[]
}

const statusOptions = Object.values(TASK_STATUS)
const priorityOptions = Object.values(TASK_PRIORITY)

function TasksContent() {
  const searchParams = useSearchParams()
  const projectFilter = searchParams.get("project_id") ?? undefined
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createSelectedWorkers, setCreateSelectedWorkers] = useState<string[]>([])
  const [createWorkerSelectOpen, setCreateWorkerSelectOpen] = useState(false)

  const [viewTask, setViewTask] = useState<TaskRow | null>(null)

  const [editTask, setEditTask] = useState<TaskRow | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editSelectedWorkers, setEditSelectedWorkers] = useState<string[]>([])
  const [editWorkerSelectOpen, setEditWorkerSelectOpen] = useState(false)

  const [deleteTask, setDeleteTask] = useState<TaskRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { data: tasks, isLoading, isError, error } = useQuery({
    queryKey: taskKeys.list({ project_id: projectFilter } as Record<string, unknown>),
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*, task_assignments(*)")
        .order("created_at", { ascending: false })

      if (projectFilter) {
        query = query.eq("project_id", projectFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as TaskRow[]
    },
  })

  const { data: projects } = useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name")
      if (error) throw error
      return data as unknown as { id: string; name: string }[]
    },
  })

  const { data: workers } = useQuery({
    queryKey: workerKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "worker")
        .order("full_name")
      if (error) throw error
      return data as unknown as { id: string; full_name: string }[]
    },
  })

  const { data: allProfiles } = useQuery({
    queryKey: ["profiles", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name")
      if (error) throw error
      return data as unknown as { id: string; full_name: string }[]
    },
  })

  const createForm = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      status: "pending",
      priority: "medium",
      project_id: projectFilter ?? "",
    },
  })

  const editForm = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  })

  useEffect(() => {
    if (editTask) {
      editForm.reset({
        title: editTask.title,
        description: editTask.description ?? "",
        project_id: editTask.project_id,
        status: editTask.status,
        priority: editTask.priority,
        deadline: editTask.deadline ? editTask.deadline.split("T")[0] : "",
      })
      setEditSelectedWorkers(editTask.task_assignments.map((a) => a.worker_id))
    }
  }, [editTask, editForm])

  const onCreateSubmit = async (data: TaskFormData) => {
    setCreateSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreateSubmitting(false); return }

    const { error: taskError } = await supabase.from("tasks").insert({
      project_id: data.project_id,
      title: data.title,
      description: data.description || null,
      status: data.status || "pending",
      priority: data.priority || "medium",
      deadline: data.deadline || null,
      created_by: user.id,
    } as never)

    if (taskError) { setCreateSubmitting(false); return }

    if (createSelectedWorkers.length > 0) {
      const { data: tasksList } = await supabase
        .from("tasks")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)

      const newTask = (tasksList as unknown as { id: string }[] | null)?.[0]
      if (newTask) {
        await supabase.from("task_assignments").insert(
          createSelectedWorkers.map((workerId) => ({
            task_id: newTask.id,
            worker_id: workerId,
            assigned_by: user.id,
          })) as never,
        )
      }
    }

    setCreateSubmitting(false)
    setCreateOpen(false)
    createForm.reset()
    setCreateSelectedWorkers([])
    queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    toast.success("Task created")
  }

  const onEditSubmit = useCallback(async (data: TaskFormData) => {
    if (!editTask) return
    setEditSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setEditSubmitting(false); return }

    const { error: taskError } = await supabase
      .from("tasks")
      .update({
        project_id: data.project_id,
        title: data.title,
        description: data.description || null,
        status: data.status || "pending",
        priority: data.priority || "medium",
        deadline: data.deadline || null,
      } as never)
      .eq("id", editTask.id)

    if (taskError) { setEditSubmitting(false); return }

    await supabase.from("task_assignments").delete().eq("task_id", editTask.id)

    if (editSelectedWorkers.length > 0) {
      await supabase.from("task_assignments").insert(
        editSelectedWorkers.map((workerId) => ({
          task_id: editTask.id,
          worker_id: workerId,
          assigned_by: user.id,
        })) as never,
      )
    }

    setEditSubmitting(false)
    setEditTask(null)
    setViewTask(null)
    queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    toast.success("Task updated")
  }, [editTask, editSelectedWorkers, supabase, queryClient])

  const handleDelete = useCallback(async () => {
    if (!deleteTask) return
    setDeleteLoading(true)
    const { error } = await supabase.from("tasks").delete().eq("id", deleteTask.id)
    setDeleteLoading(false)
    if (error) {
      toast.error("Failed to delete task")
      return
    }
    setDeleteTask(null)
    setViewTask((prev) => (prev?.id === deleteTask.id ? null : prev))
    queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    toast.success("Task deleted")
  }, [deleteTask, supabase, queryClient])

  const profileMap = useMemo(() => {
    const map = new Map<string, string>()
    allProfiles?.forEach((p) => map.set(p.id, p.full_name))
    return map
  }, [allProfiles])

  const columns: ColumnDef<TaskRow>[] = useMemo(() => [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <button
          onClick={() => setViewTask(row.original)}
          className="text-left font-medium hover:underline"
        >
          {row.original.title}
        </button>
      ),
    },
    {
      accessorKey: "project_id",
      header: "Project",
      cell: ({ getValue }) => {
        const projectName = projects?.find((p) => p.id === getValue())?.name ?? "-"
        return projectName
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <StatusBadge type="taskStatus" value={getValue() as string} />
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ getValue }) => (
        <StatusBadge type="taskPriority" value={getValue() as string} />
      ),
    },
    {
      id: "assignees",
      header: "Assignees",
      cell: ({ row }) => row.original.task_assignments.length,
    },
    {
      accessorKey: "deadline",
      header: "Deadline",
      cell: ({ getValue }) => {
        const d = getValue() as string | null
        return d ? new Date(d).toLocaleDateString() : "-"
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setViewTask(row.original); }}
            className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            title="View"
          >
            <EyeIcon className="size-4" />
          </button>
          <button
            onClick={() => { setEditTask(row.original); }}
            className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Edit"
          >
            <PencilIcon className="size-4" />
          </button>
          <button
            onClick={() => setDeleteTask(row.original)}
            className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Delete"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      ),
    },
  ], [projects])

  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? id

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage and assign tasks"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            New Task
          </Button>
        }
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
          title: "No tasks yet",
          description: "Create your first task and assign it to workers.",
          action: { label: "New Task", onClick: () => setCreateOpen(true) },
        }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>Create a task and assign it to workers</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-title">Title</Label>
              <Input id="create-title" {...createForm.register("title")} />
              {createForm.formState.errors.title && (
                <p className="text-sm text-destructive">{createForm.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea id="create-description" {...createForm.register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={createForm.watch("project_id")}
                   onValueChange={(v) => createForm.setValue("project_id", v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={createForm.watch("priority")}
                   onValueChange={(v) => createForm.setValue("priority", v ?? "medium")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={createForm.watch("status")}
                   onValueChange={(v) => createForm.setValue("status", v ?? "pending")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-deadline">Deadline</Label>
                <Input id="create-deadline" type="date" {...createForm.register("deadline")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign Workers</Label>
              <Popover open={createWorkerSelectOpen} onOpenChange={setCreateWorkerSelectOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {createSelectedWorkers.length > 0
                        ? `${createSelectedWorkers.length} worker${createSelectedWorkers.length > 1 ? "s" : ""} selected`
                        : "Select workers..."}
                      <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search workers..." />
                    <CommandEmpty>No workers found.</CommandEmpty>
                    <CommandGroup>
                      {workers?.map((worker) => (
                        <CommandItem
                          key={worker.id}
                          value={worker.full_name}
                          onSelect={() => {
                            setCreateSelectedWorkers((prev) =>
                              prev.includes(worker.id)
                                ? prev.filter((id) => id !== worker.id)
                                : [...prev, worker.id],
                            )
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 size-4",
                              createSelectedWorkers.includes(worker.id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {worker.full_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); setCreateSelectedWorkers([]); createForm.reset() }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewTask} onOpenChange={(open) => { if (!open) setViewTask(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewTask?.title}</DialogTitle>
            <DialogDescription>
              {viewTask && projectName(viewTask.project_id)}
            </DialogDescription>
          </DialogHeader>
          {viewTask && (
            <div className="space-y-4">
              {viewTask.description && (
                <div>
                  <Label>Description</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{viewTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <StatusBadge type="taskStatus" value={viewTask.status} />
                  </div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <div className="mt-1">
                    <StatusBadge type="taskPriority" value={viewTask.priority} />
                  </div>
                </div>
              </div>
              <div>
                <Label>Deadline</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {viewTask.deadline ? new Date(viewTask.deadline).toLocaleDateString() : "Not set"}
                </p>
              </div>
              <div>
                <Label>Assigned Workers</Label>
                <div className="mt-1">
                  {viewTask.task_assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No workers assigned</p>
                  ) : (
                    <ul className="space-y-1">
                      {viewTask.task_assignments.map((a) => (
                        <li key={a.id} className="text-sm text-muted-foreground">
                          {profileMap.get(a.worker_id) ?? a.worker_id}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTask(null)}>
              Close
            </Button>
            {viewTask && (
              <Button
                onClick={() => {
                  setEditTask(viewTask)
                }}
              >
                <PencilIcon />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTask} onOpenChange={(open) => { if (!open) setEditTask(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details and assignments</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" {...editForm.register("title")} />
              {editForm.formState.errors.title && (
                <p className="text-sm text-destructive">{editForm.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" {...editForm.register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={editForm.watch("project_id")}
                   onValueChange={(v) => editForm.setValue("project_id", v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={editForm.watch("priority")}
                   onValueChange={(v) => editForm.setValue("priority", v ?? "medium")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.watch("status")}
                   onValueChange={(v) => editForm.setValue("status", v ?? "pending")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-deadline">Deadline</Label>
                <Input id="edit-deadline" type="date" {...editForm.register("deadline")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign Workers</Label>
              <Popover open={editWorkerSelectOpen} onOpenChange={setEditWorkerSelectOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {editSelectedWorkers.length > 0
                        ? `${editSelectedWorkers.length} worker${editSelectedWorkers.length > 1 ? "s" : ""} selected`
                        : "Select workers..."}
                      <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search workers..." />
                    <CommandEmpty>No workers found.</CommandEmpty>
                    <CommandGroup>
                      {workers?.map((worker) => (
                        <CommandItem
                          key={worker.id}
                          value={worker.full_name}
                          onSelect={() => {
                            setEditSelectedWorkers((prev) =>
                              prev.includes(worker.id)
                                ? prev.filter((id) => id !== worker.id)
                                : [...prev, worker.id],
                            )
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 size-4",
                              editSelectedWorkers.includes(worker.id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {worker.full_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTask(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTask}
        onOpenChange={(open) => { if (!open) setDeleteTask(null) }}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteTask?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense>
      <TasksContent />
    </Suspense>
  )
}
