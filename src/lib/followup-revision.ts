import { createHash } from "node:crypto";
/** Opaque revision of every writable field; no schema change or secret required. */
export function followupRevision(row: Record<string, any> | null | undefined) {
  if (!row) return "absent";
  return createHash("sha256")
    .update(
      JSON.stringify([
        String(row.submission_id),
        row.state,
        row.note,
        row.actor,
        row.public_message || "",
        row.next_followup_at
          ? new Date(row.next_followup_at).toISOString()
          : null,
        row.updated_at ? new Date(row.updated_at).toISOString() : null,
      ]),
    )
    .digest("hex");
}
