"use client"

import { use, useMemo } from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { projectKeys, taskKeys, reportKeys } from "@/lib/supabase/query-keys"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeftIcon, PlusIcon } from "lucide-react"
import { PROJECT_STATUS } from "@/lib/constants"
import type { ColumnDef } from "@tanstack/react-table"
import type { Task, ProgressReport } from "@/types/database"

interface Props {
  params: Promise<{ id: string }>
}

export default function ProjectDetailPage({ params }: Props) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: project, isLoading } = useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single()
      if (error) throw error
      return data
    },
  })

  const typedProject = project as unknown as {
    id: string
    name: string
    description: string | null
    location: string | null
    status: string
    start_date: string
    end_date: string | null
    created_by: string
    created_at: string
    updated_at: string
  } | undefined

  async function updateStatus(status: string | null) {
    if (!status) return
    const { error } = await supabase
      .from("projects")
      .update({ status } as never)
      .eq("id", id)
    if (!error) {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) })
    }
  }

  const { data: tasks } = useQuery({
    queryKey: taskKeys.list({ project_id: id } as Record<string, unknown>),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, task_assignments(*)")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as unknown as (Task & { task_assignments: { worker_id: string }[] })[]
    },
    enabled: !!id,
  })

  const { data: reports } = useQuery({
    queryKey: reportKeys.list({ project_id: id } as Record<string, unknown>),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_reports")
        .select("*, profiles(full_name)")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as unknown as (ProgressReport & { profiles: { full_name: string } })[]
    },
    enabled: !!id,
  })

  const taskColumns: ColumnDef<Task & { task_assignments: { worker_id: string }[] }>[] = useMemo(() => [
    {
      accessorKey: "title",
      header: "Task",
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
  ], [])

  if (isLoading) return null
  if (!typedProject) return <p>Project not found</p>

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/projects"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Projects
        </Link>
        <PageHeader
          title={typedProject.name}
          description={typedProject.location ?? undefined}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={typedProject.status} onValueChange={updateStatus}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <StatusBadge type="projectStatus" value={typedProject.status} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PROJECT_STATUS.PLANNING}>Planning</SelectItem>
                <SelectItem value={PROJECT_STATUS.ACTIVE}>Active</SelectItem>
                <SelectItem value={PROJECT_STATUS.ON_HOLD}>On Hold</SelectItem>
                <SelectItem value={PROJECT_STATUS.COMPLETED}>Completed</SelectItem>
                <SelectItem value={PROJECT_STATUS.CANCELLED}>Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Start Date</CardTitle>
          </CardHeader>
          <CardContent>
            {new Date(typedProject.start_date).toLocaleDateString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>End Date</CardTitle>
          </CardHeader>
          <CardContent>
            {typedProject.end_date ? new Date(typedProject.end_date).toLocaleDateString() : "Not set"}
          </CardContent>
        </Card>
      </div>

      {typedProject.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>{typedProject.description}</CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <Button size="sm" nativeButton={false} render={<Link href={`/admin/tasks?project_id=${id}`} />}>
            <PlusIcon />
            Add Task
          </Button>
        </div>
        <DataTable
          columns={taskColumns}
          data={tasks}
          emptyState={{
            title: "No tasks yet",
            description: "Add tasks to this project.",
          }}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Progress Reports</h2>
          <Button size="sm" nativeButton={false} render={<Link href={`/admin/reports?project_id=${id}`} />}>
            <PlusIcon />
            Add Report
          </Button>
        </div>
        <DataTable
          columns={[
            { accessorKey: "title", header: "Title" },
            {
              accessorKey: "created_at",
              header: "Date",
              cell: ({ getValue }) =>
                new Date(getValue() as string).toLocaleDateString(),
            },
            {
              accessorKey: "profiles",
              header: "Created By",
              cell: ({ getValue }) => {
                const profile = getValue() as { full_name: string } | undefined
                return profile?.full_name ?? "-"
              },
            },
          ]}
          data={reports}
          emptyState={{
            title: "No reports yet",
            description: "Add progress reports to document project milestones.",
          }}
        />
      </div>
    </div>
  )
}
