import { Suspense } from "react";
import { HtgfLogo } from "~/components/htgf-logo";
import { PinForm } from "~/components/pin-form";

export default function EnterPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col px-6 py-6 sm:px-10">
      <header className="mx-auto flex w-full max-w-6xl items-center">
        <HtgfLogo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center py-16">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          <h1 className="font-heading text-[clamp(2.75rem,8vw,4.25rem)] leading-[0.96] tracking-tight">
            Erstgespräch
            <br />
            hinter der Tür.
          </h1>
          <p className="font-serif mt-6 max-w-sm text-lg leading-snug text-muted-foreground">
            Demo-PIN, dann entweder anrufen oder die Memos lesen.
          </p>
          <Suspense>
            <PinForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
