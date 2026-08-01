"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ROUTES, SITE_NAME } from "@/lib/constants"
import {
  LayoutDashboardIcon,
  ClipboardListIcon,
  CalendarCheckIcon,
  UserIcon,
  MenuIcon,
  LogOutIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/stores/auth-store"

function isPathActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href.split("/").length > 2 && pathname.startsWith(href + "/")) return true
  return false
}

const navItems = [
  { label: "Dashboard", href: ROUTES.WORKER.DASHBOARD, icon: LayoutDashboardIcon },
  { label: "My Tasks", href: ROUTES.WORKER.TASKS, icon: ClipboardListIcon },
  { label: "Attendance", href: ROUTES.WORKER.ATTENDANCE, icon: CalendarCheckIcon },
  { label: "Profile", href: ROUTES.WORKER.PROFILE, icon: UserIcon },
]

function DesktopNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {navItems.map((item) => {
        const isActive = isPathActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const reset = useAuthStore((s) => s.reset)

  async function handleLogout() {
    await supabase.auth.signOut()
    reset()
    router.push("/login")
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation menu"
            title="Menu"
          >
            <MenuIcon className="size-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="flex w-64 flex-col gap-1 p-4 pt-12">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
        <div className="mt-auto border-t pt-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg border border-destructive/40 px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOutIcon className="size-5" />
            Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DesktopLogout() {
  const router = useRouter()
  const supabase = createClient()
  const reset = useAuthStore((s) => s.reset)

  async function handleLogout() {
    await supabase.auth.signOut()
    reset()
    router.push("/login")
  }

  return (
    <Button
      variant="destructive"
      size="icon-sm"
      onClick={handleLogout}
      aria-label="Sign out"
      title="Sign out"
      className="ml-auto border-destructive/40"
    >
      <LogOutIcon className="size-4" />
    </Button>
  )
}

function WorkerNav() {
  const pathname = usePathname()
  const currentPage = navItems.find((item) => isPathActive(pathname, item.href))

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <MobileNav />
      <span className="text-lg font-semibold tracking-tight">
        {currentPage?.label ?? SITE_NAME}
      </span>
      <DesktopNav />
      <DesktopLogout />
    </header>
  )
}

export { WorkerNav }
