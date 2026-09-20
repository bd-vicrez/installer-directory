"use client";
import { useEffect, useState } from "react";
export default function InquiryFollowup({ id }: { id: number }) {
  const [value, setValue] = useState({
      state: "new",
      note: "",
      actor: "",
      next_followup_at: "",
    }),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [opened, setOpened] = useState(false);
  useEffect(() => {
    if (!opened) return;
    fetch("/api/admin/inquiry-followup?id=" + id)
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => {
        const row = d.records?.find((r: any) => r.submission_id == id);
        if (row)
          setValue({
            ...row,
            next_followup_at: row.next_followup_at
              ? new Date(row.next_followup_at).toISOString().slice(0, 16)
              : "",
          });
      })
      .catch(() => setMessage("Could not load saved follow-up."));
  }, [id, opened]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/admin/inquiry-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...value,
          submission_id: id,
          next_followup_at: value.next_followup_at
            ? new Date(value.next_followup_at + "Z").toISOString()
            : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage("Outcome saved. No message was sent.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="border-t pt-3"
      onToggle={(e) => {
        if (e.currentTarget.open) setOpened(true);
      }}
    >
      <summary className="cursor-pointer font-semibold">
        Record follow-up or outcome
      </summary>
      <form onSubmit={save} className="grid gap-3 mt-3">
        <p className="text-sm">
          Record an outcome only from actual contact or shop/customer
          confirmation. This does not schedule an appointment or send a message.
        </p>
        <label>
          Outcome
          <select
            className="input-field block w-full"
            value={value.state}
            onChange={(e) => setValue({ ...value, state: e.target.value })}
          >
            {["new", "contacted", "quoted", "booked", "declined"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <p className="text-sm">
          Your signed-in staff identity is recorded with this outcome.
        </p>
        <label>
          Evidence / note
          <textarea
            required
            minLength={10}
            maxLength={1000}
            className="input-field block w-full"
            value={value.note}
            onChange={(e) => setValue({ ...value, note: e.target.value })}
          />
        </label>
        <label>
          Next follow-up (UTC, optional)
          <input
            type="datetime-local"
            className="input-field block w-full"
            value={value.next_followup_at}
            onChange={(e) =>
              setValue({ ...value, next_followup_at: e.target.value })
            }
          />
        </label>
        <button disabled={busy} className="btn-secondary">
          {busy ? "Saving…" : "Save outcome"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
