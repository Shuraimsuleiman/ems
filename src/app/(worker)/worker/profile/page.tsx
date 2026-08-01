"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/stores/auth-store"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { FolderKanbanIcon, PencilIcon } from "lucide-react"
import { toast } from "sonner"

export default function WorkerProfilePage() {
  const supabase = createClient()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  const { data: projects } = useQuery({
    queryKey: ["worker", "projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, location, status, start_date, end_date")
        .eq("status", "active")
        .order("name", { ascending: true })
      if (error) throw error
      return data as unknown as { id: string; name: string; location: string | null; status: string; start_date: string; end_date: string | null }[]
    },
    enabled: !!user?.id,
  })

  const setProfile = useAuthStore((s) => s.setProfile)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")

  const updateName = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name } as never)
        .eq("id", profile!.id)
      if (error) throw error
    },
    onSuccess: () => {
      setProfile({ ...profile!, full_name: editName })
      toast.success("Name updated successfully")
      setEditOpen(false)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update name")
    },
  })

  function handleSave() {
    if (!editName.trim()) {
      toast.error("Name cannot be empty")
      return
    }
    updateName.mutate(editName.trim())
  }

  if (!profile) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your account and assignment information"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Full Name</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2">
            <span>{profile.full_name}</span>
            <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (open) setEditName(profile.full_name) }}>
              <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Edit name" title="Edit name" />}>
                <PencilIcon className="size-3.5" />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Full Name</DialogTitle>
                </DialogHeader>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your full name"
                />
                <div className="flex justify-end gap-2">
                  <DialogClose render={<Button variant="outline">Cancel</Button>} />
                  <Button onClick={handleSave} disabled={updateName.isPending}>
                    {updateName.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
          </CardHeader>
          <CardContent>{profile.email}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Role</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge type="projectStatus" value={profile.role} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Phone</CardTitle>
          </CardHeader>
          <CardContent>{profile.phone ?? "Not set"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Member Since</CardTitle>
          </CardHeader>
          <CardContent>
            {new Date(profile.created_at).toLocaleDateString()}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Active Projects</h2>
        {!projects || projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanbanIcon className="size-6" />}
            title="No active projects"
            description="You are not currently assigned to any active projects."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle className="text-base">{project.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {project.location && (
                    <p className="text-muted-foreground">{project.location}</p>
                  )}
                  <p className="text-muted-foreground">
                    {new Date(project.start_date).toLocaleDateString()}
                    {project.end_date && ` — ${new Date(project.end_date).toLocaleDateString()}`}
                  </p>
                  <div>
                    <StatusBadge type="projectStatus" value={project.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
