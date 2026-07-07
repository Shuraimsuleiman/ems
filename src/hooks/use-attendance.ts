"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { attendanceKeys } from "@/lib/supabase/query-keys"
import type { AttendanceLog } from "@/types/database"

interface AttendanceFilters {
  worker_id?: string
  date_from?: string
  date_to?: string
}

function useAttendance(filters?: AttendanceFilters) {
  const supabase = createClient()

  return useQuery({
    queryKey: attendanceKeys.list(filters as Record<string, unknown>),
    queryFn: async () => {
      let query = supabase
        .from("attendance_logs")
        .select("*, profiles(full_name, email)")

      if (filters?.worker_id) {
        query = query.eq("worker_id", filters.worker_id)
      }
      if (filters?.date_from) {
        query = query.gte("date", filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte("date", filters.date_to)
      }

      const { data, error } = await query.order("date", { ascending: false })

      if (error) throw error
      return data as unknown as (AttendanceLog & { profiles: { full_name: string; email: string } })[]
    },
  })
}

export { useAttendance }
