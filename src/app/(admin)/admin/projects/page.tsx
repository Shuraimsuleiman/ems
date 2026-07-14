"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { projectKeys } from "@/lib/supabase/query-keys"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
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
import { PlusIcon, EyeIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import type { Project } from "@/types/database"
import { PROJECT_STATUS } from "@/lib/constants"

const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  status: z.string().min(1),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

const statusOptions = Object.values(PROJECT_STATUS)

export default function ProjectsPage() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { data: projects, isLoading, isError, error } = useQuery({
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

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: "planning",
      start_date: new Date().toISOString().split("T")[0],
    },
  })

  const onSubmit = async (data: ProjectFormData) => {
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const { error } = await supabase.from("projects").insert({
      name: data.name,
      description: data.description || null,
      location: data.location || null,
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date || null,
      created_by: user.id,
    } as never)

    setSubmitting(false)
    if (error) return

    setOpen(false)
    form.reset()
    queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
  }

  const columns: ColumnDef<Project>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          href={`/admin/projects/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ getValue }) => (getValue() as string | null) ?? "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <StatusBadge type="projectStatus" value={getValue() as string} />
      ),
    },
    {
      accessorKey: "start_date",
      header: "Start Date",
      cell: ({ getValue }) => {
        const date = getValue() as string
        return date ? new Date(date).toLocaleDateString() : "-"
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/admin/projects/${row.original.id}`}
          className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <EyeIcon className="size-4" />
        </Link>
      ),
    },
  ], [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage construction projects"
        actions={
          <Button onClick={() => setOpen(true)}>
            <PlusIcon />
            New Project
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={projects}
        isLoading={isLoading}
        isError={isError}
        errorMessage={(error as Error)?.message}
        onRetry={() => queryClient.invalidateQueries({ queryKey: projectKeys.lists() })}
        searchKey="name"
        searchPlaceholder="Search projects..."
        emptyState={{
          title: "No projects yet",
          description: "Create your first project to get started.",
          action: { label: "New Project", onClick: () => setOpen(true) },
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
              Create a new construction project
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...form.register("location")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" type="date" {...form.register("start_date")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" type="date" {...form.register("end_date")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
