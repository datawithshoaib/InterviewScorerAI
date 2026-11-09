import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
}

function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default: "border-transparent bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80 dark:bg-zinc-50 dark:text-zinc-900",
    secondary: "border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-100/80 dark:bg-zinc-800 dark:text-zinc-50",
    destructive: "border-transparent bg-rose-500/15 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-900/50",
    outline: "text-zinc-950 border border-zinc-200 dark:text-zinc-50 dark:border-zinc-800",
    success: "border-emerald-300 bg-emerald-50 text-emerald-800 border dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    warning: "border-amber-300 bg-amber-50 text-amber-800 border dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    info: "border-blue-300 bg-blue-50 text-blue-800 border dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
