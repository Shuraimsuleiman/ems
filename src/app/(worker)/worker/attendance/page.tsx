"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { attendanceKeys } from "@/lib/supabase/query-keys"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogInIcon, LogOutIcon } from "lucide-react"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import type { AttendanceLog } from "@/types/database"

export default function WorkerAttendancePage() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const user = useAuthStore((s) => s.user)
  const [submitting, setSubmitting] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  const { data: todayRecord, isLoading: todayLoading } = useQuery({
    queryKey: ["worker", "today-attendance", user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("worker_id", user!.id)
        .eq("date", today)
        .maybeSingle()
      if (error) throw error
      return data as unknown as AttendanceLog | null
    },
    enabled: !!user?.id,
  })

  const { data: history, isLoading, isError, error } = useQuery({
    queryKey: attendanceKeys.list({ worker_id: user?.id } as Record<string, unknown>),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("worker_id", user!.id)
        .order("date", { ascending: false })
        .limit(60)
      if (error) throw error
      return data as unknown as AttendanceLog[]
    },
    enabled: !!user?.id,
  })

  async function handleCheckIn() {
    setSubmitting(true)
    const { error } = await supabase.from("attendance_logs").insert({
      worker_id: user!.id,
      date: today,
      check_in: new Date().toISOString(),
    } as never)
    setSubmitting(false)
    if (error) {
      toast.error("Failed to check in")
      return
    }
    toast.success("Checked in successfully")
    queryClient.invalidateQueries({ queryKey: ["worker", "today-attendance"] })
    queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })
  }

  async function handleCheckOut() {
    if (!todayRecord?.id) return
    setSubmitting(true)
    const { error } = await supabase
      .from("attendance_logs")
      .update({ check_out: new Date().toISOString() } as never)
      .eq("id", todayRecord.id)
    setSubmitting(false)
    if (error) {
      toast.error("Failed to check out")
      return
    }
    toast.success("Checked out successfully")
    queryClient.invalidateQueries({ queryKey: ["worker", "today-attendance"] })
    queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })
  }

  const isCheckedIn = !!todayRecord?.check_in
  const isCheckedOut = !!todayRecord?.check_out

  const columns: ColumnDef<AttendanceLog>[] = useMemo(() => [
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
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const checkIn = row.original.check_in
        const checkOut = row.original.check_out
        if (!checkIn || !checkOut) return "-"
        const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
        const hours = Math.floor(diff / 3600000)
        const minutes = Math.floor((diff % 3600000) / 60000)
        return `${hours}h ${minutes}m`
      },
    },
  ], [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Check in and out for the day"
      />

      <Card>
        <CardHeader>
          <CardTitle>Today — {new Date().toLocaleDateString()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Check In</p>
                  <p className="mt-1 text-lg font-semibold">
                    {todayRecord?.check_in
                      ? new Date(todayRecord.check_in).toLocaleTimeString()
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Check Out</p>
                  <p className="mt-1 text-lg font-semibold">
                    {todayRecord?.check_out
                      ? new Date(todayRecord.check_out).toLocaleTimeString()
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!isCheckedIn ? (
                  <Button className="flex-1" onClick={handleCheckIn} disabled={submitting}>
                    <LogInIcon />
                    {submitting ? "Checking in..." : "Check In"}
                  </Button>
                ) : !isCheckedOut ? (
                  <Button className="flex-1" variant="outline" onClick={handleCheckOut} disabled={submitting}>
                    <LogOutIcon />
                    {submitting ? "Checking out..." : "Check Out"}
                  </Button>
                ) : (
                  <p className="w-full text-center text-sm text-muted-foreground">
                    You have completed your attendance for today
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Attendance History</h2>
        <DataTable
          columns={columns}
          data={history}
          isLoading={isLoading}
          isError={isError}
          errorMessage={(error as Error)?.message}
          onRetry={() => queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })}
          emptyState={{
            title: "No attendance records",
            description: "Your attendance history will appear here once you start checking in.",
          }}
        />
      </div>
    </div>
  )
}
