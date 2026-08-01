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
  AreaChart,
  Area,
} from "recharts"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { useAuthStore } from "@/stores/auth-store"
import {
  FolderKanbanIcon,
  ClipboardListIcon,
  UsersIcon,
  CalendarCheckIcon,
} from "lucide-react"
import {
  ChartCard,
  ChartTooltip,
  ChartLegend,
  DonutChart,
} from "@/components/shared/chart-card"
import {
  lastNDays,
  formatDayLabel,
  hoursBetween,
  truncateLabel,
} from "@/lib/chart-utils"

const TASK_COLORS: Record<string, string> = {
  pending: "var(--chart-4)",
  in_progress: "var(--chart-3)",
  completed: "var(--chart-1)",
}

const PROJECT_COLORS: Record<string, string> = {
  planning: "var(--chart-2)",
  active: "var(--chart-1)",
  on_hold: "var(--chart-4)",
  completed: "var(--chart-3)",
  cancelled: "var(--chart-5)",
}

const TASK_STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
} as const

const PROJECT_STATUS_LABELS = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
} as const

export default function AdminDashboard() {
  const supabase = createClient()
  const profile = useAuthStore((s) => s.profile)

  const { data: taskCounts, isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard", "task-status"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("status")
      const rows = data as unknown as { status: string }[] | null
      const counts = { pending: 0, in_progress: 0, completed: 0 }
      for (const t of rows ?? []) {
        if (t.status in counts) counts[t.status as keyof typeof counts]++
      }
      return counts
    },
  })

  const { data: projectCounts, isLoading: projectsLoading } = useQuery({
    queryKey: ["dashboard", "project-status"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("status")
      const rows = data as unknown as { status: string }[] | null
      const counts = { planning: 0, active: 0, on_hold: 0, completed: 0, cancelled: 0 }
      for (const p of rows ?? []) {
        if (p.status in counts) counts[p.status as keyof typeof counts]++
      }
      return counts
    },
  })

  const { data: workersCount } = useQuery({
    queryKey: ["dashboard", "workers"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "worker")
      return count ?? 0
    },
  })

  const { data: todayAttendance } = useQuery({
    queryKey: ["dashboard", "attendance"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0]
      const { count } = await supabase
        .from("attendance_logs")
        .select("id", { count: "exact", head: true })
        .eq("date", today)
      return count ?? 0
    },
  })

  const { data: attendanceTrend } = useQuery({
    queryKey: ["dashboard", "attendance-trend"],
    queryFn: async () => {
      const days = lastNDays(14)
      const { data } = await supabase
        .from("attendance_logs")
        .select("date, check_in")
        .gte("date", days[0])
      const rows = data as unknown as { date: string; check_in: string | null }[] | null
      const perDay: Record<string, number> = {}
      for (const a of rows ?? []) {
        if (a.check_in) perDay[a.date] = (perDay[a.date] ?? 0) + 1
      }
      return days.map((d) => ({ label: formatDayLabel(d), count: perDay[d] ?? 0 }))
    },
  })

  const { data: workload } = useQuery({
    queryKey: ["dashboard", "workload"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("status, task_assignments(worker_id, profiles(full_name))")
        .in("status", ["pending", "in_progress"])
      const rows = data as unknown as {
        task_assignments: {
          worker_id: string
          profiles: { full_name: string } | null
        }[] | null
      }[] | null
      const perWorker: Record<string, { name: string; count: number }> = {}
      for (const t of rows ?? []) {
        for (const a of t.task_assignments ?? []) {
          if (!perWorker[a.worker_id]) {
            perWorker[a.worker_id] = { name: a.profiles?.full_name ?? "Unknown", count: 0 }
          }
          perWorker[a.worker_id].count++
        }
      }
      return Object.values(perWorker)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    },
  })

  const { data: hoursWorked } = useQuery({
    queryKey: ["dashboard", "hours-worked"],
    queryFn: async () => {
      const days = lastNDays(7)
      const { data } = await supabase
        .from("attendance_logs")
        .select("worker_id, check_in, check_out, profiles(full_name)")
        .gte("date", days[0])
      const rows = data as unknown as {
        worker_id: string
        check_in: string | null
        check_out: string | null
        profiles: { full_name: string } | null
      }[] | null
      const perWorker: Record<string, { name: string; hours: number }> = {}
      for (const a of rows ?? []) {
        const h = hoursBetween(a.check_in, a.check_out)
        if (h <= 0) continue
        if (!perWorker[a.worker_id]) {
          perWorker[a.worker_id] = { name: a.profiles?.full_name ?? "Unknown", hours: 0 }
        }
        perWorker[a.worker_id].hours += h
      }
      return Object.values(perWorker)
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 8)
    },
  })

  const { data: projectProgress } = useQuery({
    queryKey: ["dashboard", "project-progress"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, tasks(status)")
        .eq("status", "active")
      const rows = data as unknown as {
        name: string
        tasks: { status: string }[] | null
      }[] | null
      return (rows ?? []).map((p) => {
        let completed = 0
        let inProgress = 0
        for (const t of p.tasks ?? []) {
          if (t.status === "completed") completed++
          else inProgress++
        }
        return { name: p.name, completed, inProgress }
      })
    },
  })

  const taskTotal =
    (taskCounts?.pending ?? 0) +
    (taskCounts?.in_progress ?? 0) +
    (taskCounts?.completed ?? 0)
  const taskRate = taskTotal > 0 ? Math.round(((taskCounts?.completed ?? 0) / taskTotal) * 100) : 0

  const taskDonutData = Object.entries(TASK_STATUS_LABELS).map(([key, label]) => ({
    name: label,
    value: taskCounts?.[key as keyof typeof TASK_STATUS_LABELS] ?? 0,
    color: TASK_COLORS[key],
  }))

  const projectTotal = Object.values(projectCounts ?? {}).reduce((a, b) => a + b, 0)
  const projectDonutData = Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => ({
    name: label,
    value: projectCounts?.[key as keyof typeof PROJECT_STATUS_LABELS] ?? 0,
    color: PROJECT_COLORS[key],
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
        description="Overview of your construction projects"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Projects"
          value={projectCounts?.active ?? 0}
          icon={<FolderKanbanIcon className="size-5" />}
          isLoading={projectsLoading}
        />
        <StatCard
          title="Task Completion"
          value={`${taskRate}%`}
          icon={<ClipboardListIcon className="size-5" />}
          description={`${taskCounts?.completed ?? 0} of ${taskTotal} tasks`}
          isLoading={tasksLoading}
        />
        <StatCard
          title="Workers"
          value={workersCount ?? 0}
          icon={<UsersIcon className="size-5" />}
        />
        <StatCard
          title="Today's Attendance"
          value={todayAttendance ?? 0}
          icon={<CalendarCheckIcon className="size-5" />}
          description="workers checked in"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ChartCard
          title="Tasks by Status"
          description="All tasks across projects"
        >
          <DonutChart
            data={taskDonutData}
            centerTitle="complete"
            centerValue={`${taskRate}%`}
          />
          <ChartLegend items={taskDonutData.map((d) => ({ label: d.name, color: d.color }))} />
        </ChartCard>

        <ChartCard
          title="Projects by Status"
          description="All projects"
        >
          <DonutChart
            data={projectDonutData}
            centerTitle="projects"
            centerValue={`${projectTotal}`}
          />
          <ChartLegend items={projectDonutData.map((d) => ({ label: d.name, color: d.color }))} />
        </ChartCard>

        <ChartCard
          title="Hours Worked"
          description="Total hours per worker, last 7 days"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hoursWorked ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={46}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={truncateLabel}
              />
              <YAxis
                allowDecimals={false}
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
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ChartCard
          title="Attendance Trend"
          description="Daily check-ins, last 14 days"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={attendanceTrend ?? []}>
              <defs>
                <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={30}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Check-ins"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#attendanceFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Workload per Worker"
          description="Active tasks assigned per worker"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={workload ?? []} layout="vertical" margin={{ right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={truncateLabel}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
              <Bar
                dataKey="count"
                name="Active tasks"
                fill="var(--chart-3)"
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ChartCard
          title="Project Progress"
          description="Completed vs in-progress tasks on active projects"
          className="lg:col-span-3"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={projectProgress ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={46}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={truncateLabel}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={30}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
              <Bar
                dataKey="inProgress"
                name="In progress"
                stackId="a"
                fill="var(--chart-3)"
                maxBarSize={34}
              />
              <Bar
                dataKey="completed"
                name="Completed"
                stackId="a"
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
                maxBarSize={34}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2">
            <ChartLegend
              items={[
                { label: "In progress", color: "var(--chart-3)" },
                { label: "Completed", color: "var(--chart-1)" },
              ]}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
