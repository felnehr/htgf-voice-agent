"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";

export function PinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-10 flex w-full max-w-xs flex-col gap-5 text-left"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const response = await fetch("/api/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        setPending(false);
        if (!response.ok) {
          setError("PIN stimmt nicht.");
          return;
        }
        const next = searchParams.get("next") || "/";
        router.replace(next);
        router.refresh();
      }}
    >
      <FieldGroup>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="demo-pin" className="text-sm font-medium">
            PIN
          </FieldLabel>
          <Input
            id="demo-pin"
            type="password"
            autoComplete="current-password"
            value={pin}
            onChange={(event) => setPin(event.currentTarget.value)}
            aria-invalid={Boolean(error)}
            autoFocus
            required
            className="h-12 rounded-full px-4 text-base"
          />
        </Field>
      </FieldGroup>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Eintreten
      </Button>
    </form>
  );
}
