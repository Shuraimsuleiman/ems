"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type ButtonState = "loading" | "signin" | "admin" | "worker"

export function AuthButton() {
  const [state, setState] = useState<ButtonState>("loading")

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setState("signin")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single<{ role: string }>()

      if (profile?.role === "worker") {
        setState("worker")
      } else if (profile?.role === "admin" || profile?.role === "manager") {
        setState("admin")
      } else {
        setState("signin")
      }
    }

    check()
  }, [])

  if (state === "loading") {
    return <Skeleton className="h-9 w-32 rounded-lg" />
  }

  if (state === "signin") {
    return (
      <Link href="/login">
        <Button>Sign In</Button>
      </Link>
    )
  }

  const href = state === "worker" ? "/worker" : "/admin"
  return (
    <Link href={href}>
      <Button>Go to Dashboard</Button>
    </Link>
  )
}
