import { WorkerShell } from "@/components/layouts/worker-shell"

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WorkerShell>{children}</WorkerShell>
}
