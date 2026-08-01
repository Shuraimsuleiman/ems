"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ROUTES, SITE_NAME } from "@/lib/constants"
import { useUIStore } from "@/stores/ui-store"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  ClipboardListIcon,
  UsersIcon,
  CalendarCheckIcon,
  FileTextIcon,
  UserIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  MenuIcon,
  BuildingIcon,
  LogOutIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/stores/auth-store"

function isPathActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href.split("/").length > 2 && pathname.startsWith(href + "/")) return true
  return false
}

const navItems = [
  { label: "Dashboard", href: ROUTES.ADMIN.DASHBOARD, icon: LayoutDashboardIcon },
  { label: "Projects", href: ROUTES.ADMIN.PROJECTS, icon: FolderKanbanIcon },
  { label: "Tasks", href: ROUTES.ADMIN.TASKS, icon: ClipboardListIcon },
  { label: "Workers", href: ROUTES.ADMIN.WORKERS, icon: UsersIcon },
  { label: "Attendance", href: ROUTES.ADMIN.ATTENDANCE, icon: CalendarCheckIcon },
  { label: "Reports", href: ROUTES.ADMIN.REPORTS, icon: FileTextIcon },
  { label: "Profile", href: ROUTES.ADMIN.PROFILE, icon: UserIcon },
]

function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
      {navItems.map((item) => {
        const isActive = isPathActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="size-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex h-14 items-center border-b px-4",
        collapsed && "justify-center px-0",
      )}
    >
      {collapsed ? (
        <BuildingIcon className="size-5 text-muted-foreground" />
      ) : (
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <BuildingIcon className="size-5" />
          {SITE_NAME}
        </span>
      )}
    </div>
  )
}

function LogoutButton() {
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
      className="shrink-0 border-destructive/40"
    >
      <LogOutIcon className="size-4" />
    </Button>
  )
}

function DesktopSidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  return (
    <aside
      className={cn(
        "hidden border-r bg-sidebar transition-[width] duration-200 md:flex md:flex-col",
        sidebarOpen ? "w-64" : "w-16",
      )}
    >
      <SidebarHeader collapsed={!sidebarOpen} />
      <SidebarNav collapsed={!sidebarOpen} />
      <div
        className={cn(
          "mt-auto border-t p-2 flex items-center gap-1",
          sidebarOpen ? "justify-between" : "flex-col",
        )}
      >
        <LogoutButton />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftCloseIcon className="size-4" />
          ) : (
            <PanelLeftOpenIcon className="size-4" />
          )}
        </Button>
      </div>
    </aside>
  )
}

function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation menu"
            title="Menu"
          >
            <MenuIcon className="size-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SidebarHeader collapsed={false} />
        <SidebarNav collapsed={false} />
        <div className="mt-auto border-t p-2">
          <LogoutButton />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function AdminSidebar() {
  const pathname = usePathname()
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const currentPage = navItems.find((item) => isPathActive(pathname, item.href))

  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      setSidebarOpen(false)
      prevPathname.current = pathname
    }
  }, [pathname, setSidebarOpen])

  return (
    <>
      <DesktopSidebar />
      <div className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
        <MobileSidebar />
        <span className="text-lg font-semibold tracking-tight">
          {currentPage?.label ?? SITE_NAME}
        </span>
      </div>
    </>
  )
}

export { AdminSidebar }
