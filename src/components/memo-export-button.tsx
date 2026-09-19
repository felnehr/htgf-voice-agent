"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { downloadResponseFile } from "~/lib/download";
import { memoCsvFilename } from "~/lib/memo-export";

export function MemoExportButton({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const response = await fetch("/api/intakes/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationIds: [conversationId] }),
        });
        setPending(false);
        if (!response.ok) {
          toast.error("Memo konnte nicht exportiert werden.");
          return;
        }
        await downloadResponseFile(response, memoCsvFilename());
        toast.success("Memo als CSV gespeichert.");
        router.refresh();
      }}
    >
      {pending ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
      Als CSV
    </Button>
  );
}
