import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-transparent border-b-border placeholder:text-muted-foreground focus-visible:border-b-foreground aria-invalid:border-b-destructive flex field-sizing-content min-h-16 w-full rounded-none border-b bg-transparent px-0 py-2 font-serif text-lg tracking-tight transition-[color,border-color] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-base",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
