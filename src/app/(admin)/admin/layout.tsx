import { AdminShell } from "@/components/layouts/admin-shell"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminShell>{children}</AdminShell>
}
