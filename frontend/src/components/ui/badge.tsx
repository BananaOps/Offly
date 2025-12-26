import * as React from "react"
import { cn } from "../../lib/utils"

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline"
  }
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        {
          "bg-blue-500/10 text-blue-600 dark:text-blue-400": variant === "default",
          "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100": variant === "secondary",
          "bg-red-500/10 text-red-600 dark:text-red-400": variant === "destructive",
          "border border-gray-200 dark:border-gray-700": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }
