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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

  if (error) return { error: error.message }
  return { success: true }
}
