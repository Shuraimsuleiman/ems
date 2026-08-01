"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ClipboardListIcon,
  CalendarCheckIcon,
  LogInIcon,
  LogOutIcon,
  ArrowRightIcon,
  FolderKanbanIcon,
  AlarmClockIcon,
} from "lucide-react"
import Link from "next/link"
import { ROUTES } from "@/lib/constants"
import { EmptyState } from "@/components/shared/empty-state"
import {
  ChartCard,
  ChartTooltip,
  ChartLegend,
  DonutChart,
} from "@/components/shared/chart-card"
import { lastNDays, formatDayLabel, hoursBetween } from "@/lib/chart-utils"

const MY_TASK_COLORS: Record<string, string> = {
  pending: "var(--chart-4)",
  in_progress: "var(--chart-3)",
  completed: "var(--chart-1)",
}

const MY_TASK_LABELS = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
} as const

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

  const { data: myTaskCounts, isLoading: myTasksLoading } = useQuery({
    queryKey: ["worker", "my-task-status", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("status, task_assignments!inner(worker_id)")
        .eq("task_assignments.worker_id", user!.id)
      const rows = data as unknown as { status: string }[] | null
      const counts = { pending: 0, in_progress: 0, completed: 0 }
      for (const t of rows ?? []) {
        if (t.status in counts) counts[t.status as keyof typeof counts]++
      }
      return counts
    },
    enabled: !!user?.id,
  })

  const { data: myHours } = useQuery({
    queryKey: ["worker", "my-hours", user?.id],
    queryFn: async () => {
      const days = lastNDays(7)
      const { data } = await supabase
        .from("attendance_logs")
        .select("date, check_in, check_out")
        .eq("worker_id", user!.id)
        .gte("date", days[0])
      const rows = data as unknown as {
        date: string
        check_in: string | null
        check_out: string | null
      }[] | null
      const perDay: Record<string, number> = {}
      for (const a of rows ?? []) {
        perDay[a.date] = hoursBetween(a.check_in, a.check_out)
      }
      return days.map((d) => ({ label: formatDayLabel(d), hours: perDay[d] ?? 0 }))
    },
    enabled: !!user?.id,
  })

  const { data: myProjects } = useQuery({
    queryKey: ["worker", "my-projects", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("projects(id, name, status)")
        .eq("task_assignments.worker_id", user!.id)
      const rows = data as unknown as {
        projects: { id: string; name: string; status: string } | null
      }[] | null
      const seen = new Map<string, { id: string; name: string; status: string }>()
      for (const t of rows ?? []) {
        if (t.projects) seen.set(t.projects.id, t.projects)
      }
      return Array.from(seen.values())
    },
    enabled: !!user?.id,
  })

  const { data: upcoming } = useQuery({
    queryKey: ["worker", "upcoming", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0]
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
      const { data } = await supabase
        .from("tasks")
        .select("id, title, deadline, projects(name)")
        .eq("task_assignments.worker_id", user!.id)
        .not("status", "eq", "completed")
        .not("deadline", "is", null)
        .gte("deadline", today)
        .lte("deadline", `${in7}T23:59:59.999Z`)
        .order("deadline", { ascending: true })
      return (data ?? []) as unknown as {
        id: string
        title: string
        deadline: string | null
        projects: { name: string } | null
      }[]
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

  const myTaskTotal =
    (myTaskCounts?.pending ?? 0) +
    (myTaskCounts?.in_progress ?? 0) +
    (myTaskCounts?.completed ?? 0)
  const myTaskRate =
    myTaskTotal > 0 ? Math.round(((myTaskCounts?.completed ?? 0) / myTaskTotal) * 100) : 0
  const myTaskDonutData = Object.entries(MY_TASK_LABELS).map(([key, label]) => ({
    name: label,
    value: myTaskCounts?.[key as keyof typeof MY_TASK_LABELS] ?? 0,
    color: MY_TASK_COLORS[key],
  }))

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
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <ClipboardListIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasksLoading ? "..." : myTaskCounts?.completed ?? 0}</div>
            <p className="text-xs text-muted-foreground">of {myTaskTotal} assigned tasks</p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="My Hours This Week"
          description="Hours worked per day, last 7 days"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={myHours ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={12}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                allowDecimals
                tickLine={false}
                axisLine={false}
                width={30}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
              <Bar
                dataKey="hours"
                name="Hours"
                fill="var(--chart-2)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="My Tasks by Status"
          description="All tasks assigned to you"
        >
          <DonutChart
            data={myTaskDonutData}
            centerTitle="complete"
            centerValue={`${myTaskRate}%`}
          />
          <ChartLegend items={myTaskDonutData.map((d) => ({ label: d.name, color: d.color }))} />
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">My Projects</CardTitle>
            <FolderKanbanIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!myProjects || myProjects.length === 0 ? (
              <EmptyState
                icon={<FolderKanbanIcon className="size-6" />}
                title="No projects"
                description="Projects you're assigned to will appear here."
              />
            ) : (
              <div className="space-y-2">
                {myProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <span className="shrink-0 text-xs capitalize text-muted-foreground">
                      {project.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <AlarmClockIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!upcoming || upcoming.length === 0 ? (
              <EmptyState
                icon={<AlarmClockIcon className="size-6" />}
                title="Nothing due soon"
                description="No tasks due in the next 7 days."
              />
            ) : (
              <div className="space-y-2">
                {upcoming.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      {task.projects?.name && (
                        <p className="truncate text-xs text-muted-foreground">{task.projects.name}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Due {task.deadline ? new Date(task.deadline).toLocaleDateString() : ""}
                    </span>
                  </div>
                ))}
              </div>
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
