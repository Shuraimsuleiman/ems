"use server"

import { createClient } from "@supabase/supabase-js"
import { headers } from "next/headers"

export async function inviteWorker(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const email = formData.get("email") as string
  const fullName = formData.get("full_name") as string
  const role = formData.get("role") as string

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("[inviteWorker] Missing env var: NEXT_PUBLIC_SUPABASE_URL")
    return { error: "Server configuration error: NEXT_PUBLIC_SUPABASE_URL is not set." }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("[inviteWorker] Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY")
    return { error: "Server configuration error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set." }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[inviteWorker] Missing env var: SUPABASE_SERVICE_ROLE_KEY")
    return { error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set." }
  }

  console.log("[inviteWorker] All env vars loaded. Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    const host = (await headers()).get("host")
    const protocol = host?.includes("localhost") ? "http" : "https"
    const origin = `${protocol}://${host}`

    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/accept-invite`,
      data: { full_name: fullName, role },
    })

    if (error) {
      console.error("[inviteWorker] Supabase inviteUserByEmail error:", error.message)
      return { error: error.message }
    }

    console.log("[inviteWorker] Invitation sent successfully to:", email)
    return { success: true }
  } catch (err) {
    console.error("[inviteWorker] Unexpected error:", err)
    return { error: "An unexpected error occurred. Please try again." }
  }
}
