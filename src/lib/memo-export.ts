import { INTAKE_FIELDS, intakeSchema, type Intake } from "~/lib/types";

export type MemoStatus = "none" | "new" | "updated" | "exported";

export type InboxFilter = "completed" | "new" | "abandoned" | "all";

export type InboxRow = {
  id: string;
  callerName: string;
  callerCompany: string;
  startedAt: string;
  hasMemo: boolean;
  hasTranscript: boolean;
  exportedAt: string | null;
  memoUpdatedAt: string | null;
};

export function isCompleted(row: Pick<InboxRow, "hasMemo">) {
  return row.hasMemo;
}

export function isAbandoned(row: Pick<InboxRow, "hasMemo">) {
  return !row.hasMemo;
}

export function matchesInboxFilter(
  row: InboxRow,
  filter: InboxFilter,
) {
  if (filter === "completed") return isCompleted(row);
  if (filter === "new") return isExportPending(row);
  if (filter === "abandoned") return isAbandoned(row);
  return true;
}

export type MemoExportRecord = {
  id: string;
  callerName: string;
  callerEmail: string;
  callerCompany: string;
  language: string;
  startedAt: Date;
  intake: Intake;
};

export function memoStatus(row: Pick<InboxRow, "hasMemo" | "exportedAt" | "memoUpdatedAt">): MemoStatus {
  if (!row.hasMemo) return "none";
  if (!row.exportedAt) return "new";
  if (
    row.memoUpdatedAt &&
    new Date(row.memoUpdatedAt).getTime() > new Date(row.exportedAt).getTime()
  ) {
    return "updated";
  }
  return "exported";
}

export function isExportPending(row: Pick<InboxRow, "hasMemo" | "exportedAt" | "memoUpdatedAt">) {
  const status = memoStatus(row);
  return status === "new" || status === "updated";
}

export function parseIntakePayload(payload: string): Intake | null {
  try {
    const parsed = intakeSchema.safeParse(JSON.parse(payload));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function formatCsvWhen(value: Date) {
  const date = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
  const time = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
  return `${date} ${time}`;
}

export function buildMemoCsv(records: MemoExportRecord[]) {
  const headers = [
    "Datum",
    "Name",
    "E-Mail",
    "Firma",
    "Sprache",
    ...INTAKE_FIELDS.map((field) => field.de),
    "Gespräch-ID",
  ];

  const lines = records.map((record) => {
    const cells = [
      formatCsvWhen(record.startedAt),
      record.callerName,
      record.callerEmail,
      record.callerCompany,
      record.language,
      ...INTAKE_FIELDS.map((field) => record.intake[field.key]),
      record.id,
    ];
    return cells.map((cell) => csvCell(cell)).join(",");
  });

  return `\uFEFF${[headers.map(csvCell).join(","), ...lines].join("\r\n")}\r\n`;
}

export function memoCsvFilename(now = new Date()) {
  const stamp = now.toISOString().slice(0, 10);
  return `erstgespraech-memos-${stamp}.csv`;
}
