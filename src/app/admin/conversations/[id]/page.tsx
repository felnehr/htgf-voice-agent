import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AdminBackLink } from "~/components/admin-back-link";
import { ConversationRecord } from "~/components/conversation-record";
import { SiteHeader } from "~/components/site-header";
import { getDb } from "~/lib/db";
import { conversations, intakes, messages } from "~/lib/db/schema";
import { formatLatency, formatWhen } from "~/lib/format";
import { parseIntakePayload } from "~/lib/memo-export";
import { type Language } from "~/lib/types";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });
  if (!conversation) notFound();

  const [messageRows, intakeRow] = await Promise.all([
    db.query.messages.findMany({
      where: eq(messages.conversationId, id),
      orderBy: [asc(messages.createdAt)],
    }),
    db.query.intakes.findFirst({
      where: eq(intakes.conversationId, id),
    }),
  ]);

  const intake = intakeRow ? parseIntakePayload(intakeRow.payload) ?? undefined : undefined;
  const language = conversation.language as Language;
  const latency = formatLatency(conversation.totalLatencySeconds);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-8 sm:px-10">
      <SiteHeader variant="admin" />
      <div className="flex flex-col gap-6">
        <AdminBackLink />
        <ConversationRecord
        conversationId={id}
        company={conversation.callerCompany}
        callerName={conversation.callerName}
        callerEmail={conversation.callerEmail}
        agentName={conversation.agentName}
        when={`${formatWhen(conversation.startedAt, language)}${latency ? ` · ${latency}` : ""}`}
        language={language}
        intake={intake}
        messages={messageRows.map((row) => ({
          id: row.id,
          role: row.role,
          content: row.content,
        }))}
      />
      </div>
    </div>
  );
}
