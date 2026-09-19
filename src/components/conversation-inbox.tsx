"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/ui/spinner";
import { downloadResponseFile } from "~/lib/download";
import { formatWhen } from "~/lib/format";
import {
  isAbandoned,
  isCompleted,
  isExportPending,
  matchesInboxFilter,
  memoCsvFilename,
  memoStatus,
  type InboxFilter,
  type InboxRow,
  type MemoStatus,
} from "~/lib/memo-export";

const STATUS_LABEL: Record<MemoStatus, string> = {
  none: "Offen",
  new: "Neu",
  updated: "Aktualisiert",
  exported: "Exportiert",
};

const FILTERS: Array<{ id: InboxFilter; label: string }> = [
  { id: "completed", label: "Abgeschlossen" },
  { id: "new", label: "Neue" },
  { id: "abandoned", label: "Abgebrochen" },
  { id: "all", label: "Alle" },
];

function statusClassName(status: MemoStatus) {
  if (status === "new" || status === "updated") {
    return "border-transparent bg-berry text-white";
  }
  return undefined;
}

function abandonedLabel(row: InboxRow) {
  if (row.hasTranscript) return "Ohne Memo";
  return "Leer";
}

function emptyCopy(filter: InboxFilter) {
  if (filter === "completed") {
    return "Noch kein abgeschlossenes Gespräch. Abgebrochene findest du unter Abgebrochen.";
  }
  if (filter === "new") {
    return "Keine neuen Memos. Alles bereits exportiert.";
  }
  if (filter === "abandoned") {
    return "Keine abgebrochenen Gespräche.";
  }
  return "Keine Gespräche in dieser Ansicht.";
}

async function markExportState(ids: string[], exported: boolean) {
  await fetch("/api/intakes/export", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationIds: ids, exported }),
  });
}

export function ConversationInbox({ rows }: { rows: InboxRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<InboxFilter>("completed");
  const [pending, setPending] = useState(false);

  const completedRows = useMemo(() => rows.filter(isCompleted), [rows]);
  const abandonedRows = useMemo(() => rows.filter(isAbandoned), [rows]);
  const pendingRows = useMemo(() => completedRows.filter(isExportPending), [completedRows]);
  const visibleRows = useMemo(
    () => rows.filter((row) => matchesInboxFilter(row, filter)),
    [filter, rows],
  );
  const selectableVisible = visibleRows.filter((row) => row.hasMemo);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedVisible = selectableVisible.filter((row) => selectedSet.has(row.id));
  const allVisibleSelected =
    selectableVisible.length > 0 && selectedVisible.length === selectableVisible.length;
  const visiblePending = visibleRows.filter(isExportPending);
  const exportIds =
    selected.length > 0
      ? selected
      : visiblePending.length > 0
        ? visiblePending.map((row) => row.id)
        : selectableVisible.map((row) => row.id);

  const exportLabel =
    selected.length > 0
      ? `Auswahl exportieren (${selected.length})`
      : visiblePending.length > 0
        ? `Neue exportieren (${visiblePending.length})`
        : selectableVisible.length > 0
          ? `Memos exportieren (${selectableVisible.length})`
          : "Keine Memos";

  const summary =
    filter === "abandoned"
      ? `${abandonedRows.length} ${abandonedRows.length === 1 ? "abgebrochenes Gespräch" : "abgebrochene Gespräche"}`
      : filter === "new"
        ? `${pendingRows.length} ${pendingRows.length === 1 ? "neues Memo" : "neue Memos"}`
        : filter === "all"
          ? `${rows.length} ${rows.length === 1 ? "Gespräch" : "Gespräche"} · ${completedRows.length} abgeschlossen`
          : `${completedRows.length} ${completedRows.length === 1 ? "abgeschlossenes Gespräch" : "abgeschlossene Gespräche"}${
              pendingRows.length > 0 ? ` · ${pendingRows.length} neu` : ""
            }`;

  function changeFilter(next: InboxFilter) {
    setFilter(next);
    setSelected([]);
  }

  function toggle(id: string, next: boolean) {
    setSelected((current) => {
      if (next) return current.includes(id) ? current : [...current, id];
      return current.filter((item) => item !== id);
    });
  }

  async function exportMemos(ids: string[]) {
    if (ids.length === 0 || pending) return;
    setPending(true);
    const response = await fetch("/api/intakes/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationIds: ids }),
    });
    setPending(false);
    if (!response.ok) {
      toast.error("Export ist fehlgeschlagen.");
      return;
    }
    await downloadResponseFile(response, memoCsvFilename());
    setSelected([]);
    const count = Number(response.headers.get("X-Export-Count") ?? ids.length);
    toast.success(count === 1 ? "1 Memo exportiert." : `${count} Memos exportiert.`, {
      action: {
        label: "Rückgängig",
        onClick: () => {
          void markExportState(ids, false).then(() => router.refresh());
        },
      },
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5 border-b pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-xl">
            <p className="text-sm font-medium">{summary}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {filter === "abandoned"
                ? "Gestartet, aber ohne Memo. Entweder leer oder mitten im Gespräch beendet."
                : pendingRows.length > 0
                  ? "Neue oder geänderte Memos zuerst. Bereits exportierte bleiben markiert."
                  : completedRows.length > 0
                    ? "Alle Memos wurden schon exportiert. Du kannst sie trotzdem erneut wählen."
                    : "Sobald ein Memo gespeichert ist, erscheint das Gespräch hier."}
            </p>
          </div>
          {exportIds.length > 0 ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => void exportMemos(exportIds)}
            >
              {pending ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
              {exportLabel}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={filter === item.id ? "secondary" : "ghost"}
              onClick={() => changeFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
          {selectableVisible.length > 0 ? (
            <div className="flex w-full items-center gap-2 text-sm text-muted-foreground sm:ml-auto sm:w-auto">
              <Checkbox
                checked={allVisibleSelected}
                indeterminate={selectedVisible.length > 0 && !allVisibleSelected}
                aria-label="Sichtbare Memos auswählen"
                onCheckedChange={(checked) =>
                  setSelected(checked ? selectableVisible.map((row) => row.id) : [])
                }
              />
              <span>
                {selected.length > 0
                  ? `${selected.length} ausgewählt`
                  : "Alle sichtbaren Memos"}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyCopy(filter)}</p>
      ) : (
        <ul className="divide-y border-b">
          {visibleRows.map((row) => {
            const status = memoStatus(row);
            return (
              <li key={row.id} className="group">
                <div className="flex items-stretch gap-3 py-4 sm:gap-4">
                  {selectableVisible.length > 0 ? (
                    <div className="flex items-center self-center">
                      {row.hasMemo ? (
                        <Checkbox
                          checked={selectedSet.has(row.id)}
                          aria-label={`${row.callerCompany} auswählen`}
                          onCheckedChange={(checked) => toggle(row.id, checked)}
                        />
                      ) : (
                        <span className="size-5" aria-hidden />
                      )}
                    </div>
                  ) : null}
                  <Link
                    href={`/admin/conversations/${row.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 outline-none transition-colors hover:bg-muted/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-heading truncate text-lg tracking-tight">
                        {row.callerCompany}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {row.callerName} · {formatWhen(row.startedAt)}
                      </p>
                    </div>
                    {status === "none" ? (
                      <Badge variant="outline">{abandonedLabel(row)}</Badge>
                    ) : (
                      <Badge
                        variant={status === "exported" ? "secondary" : "default"}
                        className={statusClassName(status)}
                      >
                        {STATUS_LABEL[status]}
                      </Badge>
                    )}
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
