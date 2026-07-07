"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { workerKeys } from "@/lib/supabase/query-keys"
import type { Profile } from "@/types/database"

function useWorkers() {
  const supabase = createClient()

  return useQuery({
    queryKey: workerKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true })

      if (error) throw error
      return data as Profile[]
    },
  })
}

function useWorker(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: workerKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      return data as Profile
    },
    enabled: !!id,
  })
}

export { useWorkers, useWorker }
