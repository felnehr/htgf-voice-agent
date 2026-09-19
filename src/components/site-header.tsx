import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { HtgfLogo } from "~/components/htgf-logo";
import { LanguageSwitch } from "~/components/language-switch";
import { LogoutButton } from "~/components/logout-button";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { Language } from "~/lib/types";

export function SiteHeader({
  variant,
  language,
  onLanguageChange,
  languageLocked,
}: {
  variant: "caller" | "admin";
  language?: Language;
  onLanguageChange?: (language: Language) => void;
  languageLocked?: boolean;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4">
      <Link
        href={variant === "admin" ? "/admin" : "/"}
        className="flex items-center gap-4"
      >
        <HtgfLogo />
        <span className="font-heading hidden text-sm font-medium tracking-tight sm:inline">
          Erstgespräch
        </span>
      </Link>
      <nav className="flex items-center gap-2">
        {variant === "caller" && language && onLanguageChange ? (
          <LanguageSwitch
            value={language}
            onChange={onLanguageChange}
            disabled={languageLocked}
          />
        ) : null}
        {variant === "admin" ? (
          <>
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Caller
              <ArrowUpRightIcon data-icon="inline-end" />
            </Link>
            <LogoutButton />
          </>
        ) : null}
      </nav>
    </header>
  );
}
