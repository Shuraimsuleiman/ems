"use client"

import { useState, useMemo, useActionState, useEffect, useRef, startTransition } from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { workerKeys } from "@/lib/supabase/query-keys"
import { inviteWorker } from "@/lib/actions/invite-worker"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PlusIcon, EyeIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import type { Profile } from "@/types/database"

const inviteSchema = z.object({
  email: z.string().email("Invalid email"),
  full_name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
})

type InviteFormData = z.infer<typeof inviteSchema>

function InviteDialog({ open, setOpen, onSuccess }: {
  open: boolean
  setOpen: (v: boolean) => void
  onSuccess: () => void
}) {
  const [state, formAction, isPending] = useActionState(inviteWorker, null)

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "worker" },
  })

  const onSubmit = async (data: InviteFormData) => {
    const fd = new FormData()
    fd.set("email", data.email)
    fd.set("full_name", data.full_name)
    fd.set("role", data.role)
    startTransition(() => formAction(fd))
  }

  const prevSuccess = useRef(false)

  useEffect(() => {
    if (state?.success && !prevSuccess.current) {
      prevSuccess.current = true
      form.reset()
      const timer = setTimeout(() => {
        setOpen(false)
        onSuccess()
        prevSuccess.current = false
      }, 1500)
      return () => clearTimeout(timer)
    }
    if (!state?.success) {
      prevSuccess.current = false
    }
  }, [state?.success, form, setOpen, onSuccess])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Worker</DialogTitle>
          <DialogDescription>
            Send an invitation email to join ConstructPro
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" {...form.register("full_name")} />
            {form.formState.errors.full_name && (
              <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={form.watch("role")}
              onValueChange={(v) => form.setValue("role", v ?? "")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-sm text-green-600">Invitation sent successfully!</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); form.reset() }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function WorkersPage() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  const { data: workers, isLoading, isError, error } = useQuery({
    queryKey: workerKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true })
      if (error) throw error
      return data as unknown as Profile[]
    },
  })

  const columns: ColumnDef<Profile>[] = useMemo(() => [
    {
      accessorKey: "full_name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          href={`/admin/workers/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.full_name}
        </Link>
      ),
    },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ getValue }) => (
        <StatusBadge type="projectStatus" value={(getValue() as string | null) ?? ""} />
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ getValue }) => (getValue() as string | null) ?? "-",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/admin/workers/${row.original.id}`}
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
        title="Workers"
        description="View and manage workers"
        actions={
          <Button onClick={() => setOpen(true)}>
            <PlusIcon />
            Invite Worker
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={workers}
        isLoading={isLoading}
        isError={isError}
        errorMessage={(error as Error)?.message}
        onRetry={() => queryClient.invalidateQueries({ queryKey: workerKeys.lists() })}
        searchKey="full_name"
        searchPlaceholder="Search workers..."
        emptyState={{
          title: "No workers yet",
          description: "Invite workers to join the platform.",
          action: { label: "Invite Worker", onClick: () => setOpen(true) },
        }}
      />

      <InviteDialog
        open={open}
        setOpen={setOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: workerKeys.lists() })}
      />
    </div>
  )
}
