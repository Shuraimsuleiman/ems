"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { projectKeys } from "@/lib/supabase/query-keys"
import type { Project, NewProject } from "@/types/database"

function useProjects() {
  const supabase = createClient()

  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return data as unknown as Project[]
    },
  })
}

function useProject(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      return data as unknown as Project
    },
    enabled: !!id,
  })
}

function useCreateProject() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (newProject: NewProject) => {
      const { data, error } = await supabase
        .from("projects")
        .insert(newProject as never)
        .select()
        .single()

      if (error) throw error
      return data as unknown as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

function useUpdateProject() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as Project
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data.id) })
    },
  })
}

function useDeleteProject() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

export { useProjects, useProject, useCreateProject, useUpdateProject, useDeleteProject }
