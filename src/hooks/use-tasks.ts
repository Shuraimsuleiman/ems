"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { taskKeys, projectKeys } from "@/lib/supabase/query-keys"
import type { Task, NewTask, TaskAssignment } from "@/types/database"

interface TasksFilters {
  project_id?: string
  status?: string
  priority?: string
  worker_id?: string
}

function useTasks(filters?: TasksFilters) {
  const supabase = createClient()

  return useQuery({
    queryKey: taskKeys.list(filters as Record<string, unknown>),
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*, task_assignments(*)")

      if (filters?.project_id) {
        query = query.eq("project_id", filters.project_id)
      }
      if (filters?.status) {
        query = query.eq("status", filters.status)
      }
      if (filters?.priority) {
        query = query.eq("priority", filters.priority)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      return data as unknown as (Task & { task_assignments: TaskAssignment[] })[]
    },
  })
}

function useTask(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, task_assignments(*)")
        .eq("id", id)
        .single()

      if (error) throw error
      return data as unknown as Task & { task_assignments: TaskAssignment[] }
    },
    enabled: !!id,
  })
}

function useCreateTask() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      task,
      workerIds,
    }: {
      task: NewTask
      workerIds: string[]
    }) => {
      const { data: newTask, error: taskError } = await supabase
        .from("tasks")
        .insert(task as never)
        .select()
        .single()

      if (taskError) throw taskError

      if (workerIds.length > 0) {
        const assignments = workerIds.map((workerId) => ({
          task_id: (newTask as unknown as Task).id,
          worker_id: workerId,
          assigned_by: task.created_by,
        }))

        const { error: assignError } = await supabase
          .from("task_assignments")
          .insert(assignments as never)

        if (assignError) throw assignError
      }

      return newTask as unknown as Task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

function useUpdateTask() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data as unknown as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.id) })
    },
  })
}

function useDeleteTask() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

export { useTasks, useTask, useCreateTask, useUpdateTask, useDeleteTask }
