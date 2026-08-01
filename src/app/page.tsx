import { SITE_NAME } from "@/lib/constants"
import { AuthButton } from "@/components/landing/auth-button"
import {
  LayoutDashboardIcon,
  ClipboardListIcon,
  CalendarCheckIcon,
  UserIcon,
  HardHatIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  WrenchIcon,
  Trash2Icon,
  BellIcon,
  BanIcon,
  MessageSquareIcon,
  BuildingIcon,
  CrosshairIcon,
  ArrowRightIcon,
} from "lucide-react"

const features = [
  {
    icon: LayoutDashboardIcon,
    title: "Dashboard",
    description:
      "Get a snapshot of your day's active tasks, attendance status, and quick actions all in one place.",
  },
  {
    icon: ClipboardListIcon,
    title: "Task Management",
    description:
      "View all assigned tasks, track deadlines, and update progress from pending to completed in real time.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Attendance Tracking",
    description:
      "Check in and out each day with a single tap. Your full history including hours worked is always available.",
  },
  {
    icon: UserIcon,
    title: "Profile & Projects",
    description:
      "Keep your information current and see which projects you are assigned to at a glance.",
  },
]

const rules = [
  {
    icon: HardHatIcon,
    title: "Personal Protective Equipment",
    description:
      "Hard hats, safety vests, steel-toed boots, and any site-specific PPE must be worn at all times in active work zones.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Site Access & Authorization",
    description:
      "Only authorized personnel are permitted beyond designated safety barriers. All visitors must check in with the site supervisor.",
  },
  {
    icon: TriangleAlertIcon,
    title: "Incident Reporting",
    description:
      "Any injury, near miss, or equipment damage must be reported to a supervisor immediately, no matter how minor.",
  },
  {
    icon: WrenchIcon,
    title: "Tool & Equipment Safety",
    description:
      "Only operate machinery and power tools you are trained and certified to use. Inspect equipment before each use.",
  },
  {
    icon: Trash2Icon,
    title: "Housekeeping",
    description:
      "Keep work areas clean and free of debris at all times. Store materials properly and dispose of waste in designated bins.",
  },
  {
    icon: BellIcon,
    title: "Emergency Procedures",
    description:
      "Know the locations of emergency exits, first aid kits, fire extinguishers, and assembly points on your site.",
  },
  {
    icon: BanIcon,
    title: "Substance-Free Workplace",
    description:
      "Being under the influence of drugs or alcohol on site is strictly prohibited. Violators will be removed immediately.",
  },
  {
    icon: MessageSquareIcon,
    title: "Open Communication",
    description:
      "Report unsafe conditions, hazards, or concerns to your manager without delay. No question is too small.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ────────────────── Nav Bar ────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <BuildingIcon className="size-5" />
            {SITE_NAME}
          </span>
          <AuthButton />
        </div>
      </header>

      {/* ────────────────── Hero ────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              <CrosshairIcon className="size-3" />
              Construction Management Platform
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {SITE_NAME}
            </h1>
            <p className="mt-3 text-xl font-medium text-muted-foreground sm:text-2xl">
              Building Excellence. Delivering Trust.
            </p>
            <p className="mt-6 max-w-xl mx-auto text-base text-muted-foreground leading-relaxed">
              To be the leading force in modern construction management;
              building safer, smarter, and more efficiently through technology
              and teamwork. From blueprint to handover, {SITE_NAME} keeps your
              projects on track and your crew connected.
            </p>
            <div className="mt-2">
              <span className="text-xs text-muted-foreground/60">
                Our vision: empowering every site with clarity, safety, and control.
              </span>
            </div>
          </div>
        </div>

        {/* subtle gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ────────────────── Workers Portal Guide ────────────────── */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Workers Portal Guide
            </h2>
            <p className="mt-2 text-muted-foreground">
              Everything you need to manage your day, right from your phone or
              computer.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border bg-card p-6 transition-colors hover:bg-accent/50"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-background">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────────────────── Rules & Regulations ────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldCheckIcon className="size-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Workplace Safety & Regulations
            </h2>
            <p className="mt-2 text-muted-foreground">
              Safety is everyone&apos;s responsibility. Follow these rules to
              keep yourself and your teammates safe on every site.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rules.map((rule) => {
              const Icon = rule.icon
              return (
                <div
                  key={rule.title}
                  className="rounded-lg border bg-card p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{rule.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {rule.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────────────────── CTA ────────────────── */}
      <section className="border-t bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-2 text-primary-foreground/80">
            Sign in to access your dashboard or tasks.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <a
              href="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-foreground px-4 text-sm font-medium text-primary transition-colors hover:bg-primary-foreground/90"
            >
              Sign In
              <ArrowRightIcon className="size-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ────────────────── Footer ────────────────── */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-center sm:flex-row sm:text-left">
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </span>
          <span className="text-xs text-muted-foreground/60">
            Internal management platform for construction and engineering firms.
          </span>
        </div>
      </footer>
    </div>
  )
}
