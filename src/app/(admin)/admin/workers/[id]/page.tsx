"use client"

import { use, useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { workerKeys, taskKeys, attendanceKeys } from "@/lib/supabase/query-keys"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeftIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import type { Task, AttendanceLog } from "@/types/database"

interface Props {
  params: Promise<{ id: string }>
}

export default function WorkerDetailPage({ params }: Props) {
  const { id } = use(params)
  const supabase = createClient()

  const { data: workerData } = useQuery({
    queryKey: workerKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single()
      if (error) throw error
      return data as unknown as {
        id: string
        full_name: string
        email: string
        role: string
        phone: string | null
        created_at: string
      }
    },
    enabled: !!id,
  })

  const { data: tasks } = useQuery({
    queryKey: taskKeys.list({ worker_id: id } as Record<string, unknown>),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, task_assignments!inner(*), projects(name)")
        .eq("task_assignments.worker_id", id)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data as unknown as (Task & { task_assignments: { worker_id: string }[]; projects: { name: string } })[]
    },
    enabled: !!id,
  })

  const { data: attendance } = useQuery({
    queryKey: attendanceKeys.list({ worker_id: id } as Record<string, unknown>),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("worker_id", id)
        .order("date", { ascending: false })
        .limit(30)
      if (error) throw error
      return data as unknown as AttendanceLog[]
    },
    enabled: !!id,
  })

  const taskColumns: ColumnDef<Task & { projects: { name: string } }>[] = useMemo(() => [
    { accessorKey: "title", header: "Task" },
    {
      accessorKey: "projects",
      header: "Project",
      cell: ({ getValue }) => {
        const p = getValue() as { name: string } | undefined
        return p?.name ?? "-"
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
  ], [])

  const attendanceColumns: ColumnDef<AttendanceLog>[] = useMemo(() => [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
    },
    {
      accessorKey: "check_in",
      header: "Check In",
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        return v ? new Date(v).toLocaleTimeString() : "-"
      },
    },
    {
      accessorKey: "check_out",
      header: "Check Out",
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        return v ? new Date(v).toLocaleTimeString() : "-"
      },
    },
  ], [])

  if (!workerData) return null

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/workers"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Workers
        </Link>
        <PageHeader title={workerData.full_name} description={workerData.email} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Role</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge type="projectStatus" value={workerData.role} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Phone</CardTitle>
          </CardHeader>
          <CardContent>{workerData.phone ?? "Not set"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Joined</CardTitle>
          </CardHeader>
          <CardContent>
            {new Date(workerData.created_at).toLocaleDateString()}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Assigned Tasks</h2>
        <DataTable
          columns={taskColumns}
          data={tasks}
          emptyState={{
            title: "No tasks assigned",
            description: "This worker has not been assigned any tasks yet.",
          }}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Attendance (Last 30 days)</h2>
        <DataTable
          columns={attendanceColumns}
          data={attendance}
          emptyState={{
            title: "No attendance records",
            description: "No attendance data available for this worker.",
          }}
        />
      </div>
    </div>
  )
}
