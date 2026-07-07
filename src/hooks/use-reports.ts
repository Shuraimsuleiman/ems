"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { reportKeys } from "@/lib/supabase/query-keys"
import type { ProgressReport, NewProgressReport } from "@/types/database"

interface ReportsFilters {
  project_id?: string
}

function useReports(filters?: ReportsFilters) {
  const supabase = createClient()

  return useQuery({
    queryKey: reportKeys.list(filters as Record<string, unknown>),
    queryFn: async () => {
      let query = supabase
        .from("progress_reports")
        .select("*, profiles(full_name)")

      if (filters?.project_id) {
        query = query.eq("project_id", filters.project_id)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      return data as unknown as (ProgressReport & { profiles: { full_name: string } })[]
    },
  })
}

function useReport(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_reports")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      return data as unknown as ProgressReport
    },
    enabled: !!id,
  })
}

function useCreateReport() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (newReport: NewProgressReport) => {
      const { data, error } = await supabase
        .from("progress_reports")
        .insert(newReport as never)
        .select()
        .single()

      if (error) throw error
      return data as unknown as ProgressReport
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() })
    },
  })
}

export { useReports, useReport, useCreateReport }
