import type { ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function AdminBackLink({
  href = "/admin",
  children = "Alle Gespräche",
}: {
  href?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "default" }),
        "w-fit",
      )}
    >
      <ArrowLeftIcon data-icon="inline-start" />
      {children}
    </Link>
  );
}
