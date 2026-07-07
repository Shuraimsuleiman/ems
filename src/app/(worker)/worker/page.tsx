"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClipboardListIcon, CalendarCheckIcon, LogInIcon, LogOutIcon, ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import { ROUTES } from "@/lib/constants"
import { EmptyState } from "@/components/shared/empty-state"

export default function WorkerDashboard() {
  const supabase = createClient()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  const today = new Date().toISOString().split("T")[0]

  const { data: todayTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["worker", "today-tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, task_assignments!inner(*), projects(name)")
        .eq("task_assignments.worker_id", user!.id)
        .in("status", ["pending", "in_progress"])
        .order("priority", { ascending: false })
        .limit(5)
      if (error) throw error
      return data as unknown as { id: string; title: string; status: string; priority: string; deadline: string | null; projects: { name: string } }[]
    },
    enabled: !!user?.id,
  })

  const { data: todayAttendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["worker", "today-attendance", user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("worker_id", user!.id)
        .eq("date", today)
        .maybeSingle()
      if (error) throw error
      return data as unknown as { id: string; check_in: string | null; check_out: string | null } | null
    },
    enabled: !!user?.id,
  })

  const { data: completedToday } = useQuery({
    queryKey: ["worker", "completed-today", user?.id, today],
    queryFn: async () => {
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .eq("created_by", user!.id)
      return count ?? 0
    },
    enabled: !!user?.id,
  })

  async function handleCheckIn() {
    await supabase.from("attendance_logs").insert({
      worker_id: user!.id,
      date: today,
      check_in: new Date().toISOString(),
    } as never)
    window.location.reload()
  }

  async function handleCheckOut() {
    if (!todayAttendance?.id) return
    await supabase.from("attendance_logs").update({
      check_out: new Date().toISOString(),
    } as never).eq("id", todayAttendance.id)
    window.location.reload()
  }

  const isCheckedIn = !!todayAttendance?.check_in
  const isCheckedOut = !!todayAttendance?.check_out

  return (
    <div className="space-y-6">
      {profile && (
        <p className="text-sm text-muted-foreground">
          Hello, {profile.full_name} — welcome to your dashboard
        </p>
      )}
      <PageHeader
        title="Dashboard"
        description="Your tasks and attendance at a glance"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <ClipboardListIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasksLoading ? "..." : todayTasks?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">pending or in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <ClipboardListIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday ?? 0}</div>
            <p className="text-xs text-muted-foreground">tasks finished</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <CalendarCheckIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceLoading ? "..." : isCheckedIn ? (isCheckedOut ? "Completed" : "Active") : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {isCheckedOut
                ? "Checked out for today"
                : isCheckedIn
                  ? "Checked in, not yet checked out"
                  : "Not checked in today"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quick Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isCheckedIn ? (
              <Button className="w-full" size="sm" onClick={handleCheckIn}>
                <LogInIcon />
                Check In
              </Button>
            ) : !isCheckedOut ? (
              <Button className="w-full" size="sm" variant="outline" onClick={handleCheckOut}>
                <LogOutIcon />
                Check Out
              </Button>
            ) : (
              <p className="text-center text-xs text-muted-foreground">All done for today</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today&apos;s Tasks</h2>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={ROUTES.WORKER.TASKS} />}>
            View All
            <ArrowRightIcon />
          </Button>
        </div>
        {!todayTasks || todayTasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardListIcon className="size-6" />}
            title="No active tasks"
            description="You have no pending or in-progress tasks. When your manager assigns you tasks, they'll appear here."
          />
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.projects?.name}
                      {task.deadline && ` · Due ${new Date(task.deadline).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 text-xs capitalize text-muted-foreground">
                    {task.status.replace(/_/g, " ")}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
