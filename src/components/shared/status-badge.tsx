import { Badge, type badgeVariants } from "@/components/ui/badge"
import type { VariantProps } from "class-variance-authority"
import {
  TASK_STATUS,
  TASK_PRIORITY,
  PROJECT_STATUS,
} from "@/lib/constants"

const taskStatusMap: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
  [TASK_STATUS.PENDING]: "outline",
  [TASK_STATUS.IN_PROGRESS]: "default",
  [TASK_STATUS.COMPLETED]: "secondary",
}

const taskPriorityMap: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
  [TASK_PRIORITY.LOW]: "outline",
  [TASK_PRIORITY.MEDIUM]: "default",
  [TASK_PRIORITY.HIGH]: "secondary",
  [TASK_PRIORITY.URGENT]: "destructive",
}

const projectStatusMap: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
  [PROJECT_STATUS.PLANNING]: "outline",
  [PROJECT_STATUS.ACTIVE]: "default",
  [PROJECT_STATUS.ON_HOLD]: "secondary",
  [PROJECT_STATUS.COMPLETED]: "ghost",
  [PROJECT_STATUS.CANCELLED]: "destructive",
}

type StatusBadgeType = "taskStatus" | "taskPriority" | "projectStatus"

interface StatusBadgeProps {
  type: StatusBadgeType
  value: string
}

function StatusBadge({ type, value }: StatusBadgeProps) {
  const map =
    type === "taskStatus"
      ? taskStatusMap
      : type === "taskPriority"
        ? taskPriorityMap
        : projectStatusMap

  const variant = value ? (map[value] ?? "default") : "default"

  return <Badge variant={variant}>{value ? value.replace(/_/g, " ") : "-"}</Badge>
}

export { StatusBadge }
export type { StatusBadgeType }
