"use client"

import { useQuery } from "@tanstack/react-query"
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

export default function AdminDashboard() {
  const supabase = createClient()
  const profile = useAuthStore((s) => s.profile)

  const { data: projects } = useQuery({
    queryKey: ["dashboard", "projects"],
    queryFn: async () => {
      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
      return count ?? 0
    },
  })

  const { data: taskStats, isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard", "tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("status")

      const tasks = data as unknown as { status: string }[] | null
      if (!tasks) return { total: 0, completed: 0, rate: 0 }

      const total = tasks.length
      const completed = tasks.filter((t) => t.status === "completed").length
      return {
        total,
        completed,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
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
          value={projects ?? 0}
          icon={<FolderKanbanIcon className="size-5" />}
        />
        <StatCard
          title="Task Completion"
          value={taskStats ? `${taskStats.rate}%` : "0%"}
          icon={<ClipboardListIcon className="size-5" />}
          description={taskStats ? `${taskStats.completed} of ${taskStats.total} tasks` : undefined}
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
    </div>
  )
}
