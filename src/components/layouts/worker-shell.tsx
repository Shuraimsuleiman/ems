import type { ReactNode } from "react"
import { WorkerNav } from "@/components/layouts/worker-nav"

interface WorkerShellProps {
  children: ReactNode
}

function WorkerShell({ children }: WorkerShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <WorkerNav />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}

export { WorkerShell }
