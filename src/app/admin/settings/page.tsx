import { AdminBackLink } from "~/components/admin-back-link";
import { SettingsForm } from "~/components/settings-form";
import { SiteHeader } from "~/components/site-header";
import { getSettings } from "~/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-8 sm:px-10">
      <SiteHeader variant="admin" />
      <div className="flex flex-col gap-6">
        <AdminBackLink />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Admin</p>
          <h1 className="font-heading text-4xl tracking-tight">Agent</h1>
          <p className="font-serif max-w-xl text-lg leading-snug text-muted-foreground">
            Name, Ton und der Gesprächsleitfaden. Das Memo bleibt gleich — du
            bestimmst, wie gefragt wird, nicht welche Felder es gibt.
          </p>
        </div>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
