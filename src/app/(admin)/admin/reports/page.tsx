"use client"

import { useState, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { reportKeys } from "@/lib/supabase/query-keys"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PlusIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import type { ProgressReport } from "@/types/database"

const reportSchema = z.object({
  project_id: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
})

type ReportFormData = z.infer<typeof reportSchema>

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsContent />
    </Suspense>
  )
}

function ReportsContent() {
  const searchParams = useSearchParams()
  const projectFilter = searchParams.get("project_id") ?? undefined
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { data: reports, isLoading, isError, error } = useQuery({
    queryKey: reportKeys.list({ project_id: projectFilter }),
    queryFn: async () => {
      let query = supabase
        .from("progress_reports")
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false })

      if (projectFilter) {
        query = query.eq("project_id", projectFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as (ProgressReport & { profiles: { full_name: string } })[]
    },
  })

  const { data: projects } = useQuery({
    queryKey: ["projects", "select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name")
      if (error) throw error
      return data as unknown as { id: string; name: string }[]
    },
  })

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: { project_id: projectFilter ?? "" },
  })

  const onSubmit = async (data: ReportFormData) => {
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const { error } = await supabase.from("progress_reports").insert({
      project_id: data.project_id,
      title: data.title,
      content: data.content,
      created_by: user.id,
    } as never)

    setSubmitting(false)
    if (error) return

    setOpen(false)
    form.reset()
    queryClient.invalidateQueries({ queryKey: reportKeys.lists() })
  }

  const columns: ColumnDef<ProgressReport & { profiles: { full_name: string } }>[] = useMemo(() => [
    { accessorKey: "title", header: "Title" },
    {
      accessorKey: "project_id",
      header: "Project",
      cell: ({ getValue }) => {
        const p = projects?.find((p) => p.id === getValue())
        return p?.name ?? "-"
      },
    },
    {
      accessorKey: "profiles",
      header: "Created By",
      cell: ({ getValue }) => {
        const p = getValue() as { full_name: string } | undefined
        return p?.full_name ?? "-"
      },
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ getValue }) =>
        new Date(getValue() as string).toLocaleDateString(),
    },
  ], [projects])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress Reports"
        description="View and create project progress reports"
        actions={
          <Button onClick={() => setOpen(true)}>
            <PlusIcon />
            New Report
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={reports}
        isLoading={isLoading}
        isError={isError}
        errorMessage={(error as Error)?.message}
        onRetry={() => queryClient.invalidateQueries({ queryKey: reportKeys.lists() })}
        searchKey="title"
        searchPlaceholder="Search reports..."
        emptyState={{
          title: "No reports yet",
          description: "Create the first progress report to document project milestones.",
          action: { label: "New Report", onClick: () => setOpen(true) },
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Progress Report</DialogTitle>
            <DialogDescription>
              Document project progress and milestones
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Controller
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                rows={6}
                {...form.register("content")}
              />
              {form.formState.errors.content && (
                <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
