export const ROLES = {
  ADMIN: "admin" as const,
  MANAGER: "manager" as const,
  WORKER: "worker" as const,
};

export const ROUTES = {
  LOGIN: "/login",
  ADMIN: {
    DASHBOARD: "/admin",
    PROJECTS: "/admin/projects",
    TASKS: "/admin/tasks",
    WORKERS: "/admin/workers",
    ATTENDANCE: "/admin/attendance",
    REPORTS: "/admin/reports",
    PROFILE: "/admin/profile",
  },
  WORKER: {
    DASHBOARD: "/worker",
    TASKS: "/worker/tasks",
    ATTENDANCE: "/worker/attendance",
    PROFILE: "/worker/profile",
  },
} as const;

export const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export const PROJECT_STATUS = {
  PLANNING: "planning",
  ACTIVE: "active",
  ON_HOLD: "on_hold",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const SITE_NAME = "ConstructPro";
