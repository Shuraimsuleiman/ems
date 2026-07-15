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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl) {
    console.error("[inviteWorker] Missing env var: NEXT_PUBLIC_SUPABASE_URL")
    return { error: "Server configuration error: NEXT_PUBLIC_SUPABASE_URL is not set." }
  }

  if (!supabaseAnonKey) {
    console.error("[inviteWorker] Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)")
    return { error: "Server configuration error: Supabase anon/publishable key is not set." }
  }

  if (!supabaseServiceKey) {
    console.error("[inviteWorker] Missing env var: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)")
    return { error: "Server configuration error: Supabase service/secret key is not set." }
  }

  console.log("[inviteWorker] All env vars loaded. Supabase URL:", supabaseUrl)

  try {
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
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
