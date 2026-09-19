import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { ConversationInbox } from "~/components/conversation-inbox";
import { SiteHeader } from "~/components/site-header";
import { buttonVariants } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty";
import { getDb } from "~/lib/db";
import { conversations, intakes, messages } from "~/lib/db/schema";
import type { InboxRow } from "~/lib/memo-export";
import { cn } from "~/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const db = await getDb();
  const [rows, transcriptRows] = await Promise.all([
    db
      .select({
        id: conversations.id,
        callerName: conversations.callerName,
        callerCompany: conversations.callerCompany,
        startedAt: conversations.startedAt,
        intakeId: intakes.conversationId,
        exportedAt: intakes.exportedAt,
        memoUpdatedAt: intakes.updatedAt,
      })
      .from(conversations)
      .leftJoin(intakes, eq(intakes.conversationId, conversations.id))
      .orderBy(desc(conversations.startedAt)),
    db
      .selectDistinct({ conversationId: messages.conversationId })
      .from(messages),
  ]);

  const withTranscript = new Set(transcriptRows.map((row) => row.conversationId));
  const inboxRows: InboxRow[] = rows.map((row) => ({
    id: row.id,
    callerName: row.callerName,
    callerCompany: row.callerCompany,
    startedAt: row.startedAt.toISOString(),
    hasMemo: Boolean(row.intakeId),
    hasTranscript: withTranscript.has(row.id),
    exportedAt: row.exportedAt ? row.exportedAt.toISOString() : null,
    memoUpdatedAt: row.memoUpdatedAt ? row.memoUpdatedAt.toISOString() : null,
  }));

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-8 sm:px-10">
      <SiteHeader variant="admin" />
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Admin</p>
          <h1 className="font-heading text-4xl tracking-tight">Gespräche</h1>
        </div>
        <Link
          href="/admin/settings"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Einstellungen
        </Link>
      </div>
      {inboxRows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Noch keine Gespräche</EmptyTitle>
            <EmptyDescription>
              Starte ein Erstgespräch über die Caller-Oberfläche.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ConversationInbox rows={inboxRows} />
      )}
    </div>
  );
}
