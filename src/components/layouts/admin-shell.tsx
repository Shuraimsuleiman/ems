import type { ReactNode } from "react"
import { AdminSidebar } from "@/components/layouts/admin-sidebar"

interface AdminShellProps {
  children: ReactNode
}

function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}

export { AdminShell }
