"use client"

import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { attendanceKeys, workerKeys } from "@/lib/supabase/query-keys"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm, useWatch } from "react-hook-form"
import { RefreshCwIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import type { AttendanceLog } from "@/types/database"

interface AttendanceRow extends AttendanceLog {
  profiles?: { full_name: string }
}

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  const form = useForm({
    defaultValues: {
      startDate: "",
      endDate: "",
      workerId: "all",
    },
  })

  const startDate = useWatch({ control: form.control, name: "startDate" })
  const endDate = useWatch({ control: form.control, name: "endDate" })
  const workerId = useWatch({ control: form.control, name: "workerId" })

  const { data: workers } = useQuery({
    queryKey: workerKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name")
      if (error) throw error
      return data as unknown as { id: string; full_name: string }[]
    },
  })

  const { data: records, isLoading, isError, error } = useQuery({
    queryKey: attendanceKeys.list({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      worker_id: workerId !== "all" ? workerId : undefined,
    } as Record<string, unknown>),
    queryFn: async () => {
      let query = supabase
        .from("attendance_logs")
        .select("*, profiles(full_name)")
        .order("date", { ascending: false })
        .order("check_in", { ascending: false })

      if (startDate) query = query.gte("date", startDate)
      if (endDate) query = query.lte("date", endDate)
      if (workerId && workerId !== "all") query = query.eq("worker_id", workerId)

      const { data, error } = await query
      if (error) throw error
      return data as unknown as AttendanceRow[]
    },
    enabled: true,
  })

  const columns: ColumnDef<AttendanceRow>[] = useMemo(() => [
    {
      accessorKey: "profiles",
      header: "Worker",
      cell: ({ getValue }) => {
        const p = getValue() as { full_name: string } | undefined
        return p?.full_name ?? "-"
      },
    },
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Track worker attendance and hours"
        actions={
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })}
          >
            <RefreshCwIcon />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" type="date" {...form.register("startDate")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input id="endDate" type="date" {...form.register("endDate")} />
        </div>
        <div className="space-y-2">
          <Label>Worker</Label>
          <Select value={workerId ?? "all"} onValueChange={(v) => form.setValue("workerId", v ?? "all")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Workers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workers</SelectItem>
              {workers?.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={records}
        isLoading={isLoading}
        isError={isError}
        errorMessage={(error as Error)?.message}
        onRetry={() => queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })}
        emptyState={{
          title: "No attendance records",
          description: "No attendance data found for the selected filters.",
        }}
      />
    </div>
  )
}
