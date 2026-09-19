"use client"

import * as React from "react"
import { CheckIcon, MinusIcon } from "lucide-react"
import { cn } from "cn"

function Checkbox({
  checked,
  indeterminate = false,
  disabled,
  onCheckedChange,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange" | "type"> & {
  checked: boolean
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  const mixed = indeterminate && !checked

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : checked}
      disabled={disabled}
      data-slot="checkbox"
      data-state={mixed ? "indeterminate" : checked ? "checked" : "unchecked"}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40",
        checked || mixed
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/30 bg-background hover:border-foreground/55",
        className
      )}
      {...props}
    >
      {checked ? <CheckIcon className="size-3.5" /> : null}
      {mixed ? <MinusIcon className="size-3.5" /> : null}
    </button>
  )
}

export { Checkbox }
