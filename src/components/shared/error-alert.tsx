import { Button } from "@/components/ui/button"
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorAlertProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

function ErrorAlert({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorAlertProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangleIcon className="size-6" />
      </div>
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          <RefreshCwIcon />
          Try again
        </Button>
      )}
    </div>
  )
}

export { ErrorAlert }
