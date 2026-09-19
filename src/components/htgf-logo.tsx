import { cn } from "~/lib/utils";

export function HtgfLogo({ className }: { className?: string }) {
  return (
    <img
      src="/htgf-logo--black.svg"
      alt="HTGF"
      className={cn("h-7 w-auto", className)}
    />
  );
}
