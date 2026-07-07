import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "size-4 border-2",
    md: "size-8 border-[3px]",
    lg: "size-12 border-4",
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center py-12",
        className,
      )}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-muted-foreground/30 border-t-foreground",
          sizeClasses[size],
        )}
      />
    </div>
  )
}

export { LoadingSpinner }
