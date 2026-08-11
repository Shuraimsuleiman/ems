"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/stores/auth-store"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
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
import { PencilIcon } from "lucide-react"
import { toast } from "sonner"

export default function AdminProfilePage() {
  const supabase = createClient()
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [phoneEditOpen, setPhoneEditOpen] = useState(false)
  const [editPhone, setEditPhone] = useState("")

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

  const updatePhone = useMutation({
    mutationFn: async (phone: string | null) => {
      const { error } = await supabase
        .from("profiles")
        .update({ phone } as never)
        .eq("id", profile!.id)
      if (error) throw error
    },
    onSuccess: () => {
      setProfile({ ...profile!, phone: editPhone.trim() || null })
      toast.success("Phone updated successfully")
      setPhoneEditOpen(false)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update phone")
    },
  })

  function handleSavePhone() {
    updatePhone.mutate(editPhone.trim() || null)
  }

  if (!profile) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your account information"
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
          <CardContent className="flex items-center justify-between gap-2">
            <span>{profile.phone ?? "Not set"}</span>
            <Dialog open={phoneEditOpen} onOpenChange={(open) => { setPhoneEditOpen(open); if (open) setEditPhone(profile.phone ?? "") }}>
              <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Edit phone" title="Edit phone" />}>
                <PencilIcon className="size-3.5" />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Phone</DialogTitle>
                </DialogHeader>
                <Input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. +234 801 234 5678"
                />
                <div className="flex justify-end gap-2">
                  <DialogClose render={<Button variant="outline">Cancel</Button>} />
                  <Button onClick={handleSavePhone} disabled={updatePhone.isPending}>
                    {updatePhone.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
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
    </div>
  )
}
