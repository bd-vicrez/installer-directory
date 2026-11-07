"use client";
import { useEffect, useState } from "react";
export default function InquiryFollowup({ id }: { id: number }) {
  const [value, setValue] = useState({
      state: "new",
      public_message: "",
      note: "",
      actor: "",
      next_followup_at: "",
      revision: "absent",
    }),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [opened, setOpened] = useState(false),
    [loaded, setLoaded] = useState(false),
    [reload, setReload] = useState(0),
    [conflict, setConflict] = useState(false);
  useEffect(() => {
    if (!opened) return;
    let active = true;
    const controller = new AbortController();
    setLoaded(false);
    fetch("/api/admin/inquiry-followup?id=" + id, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => {
        if (!active) return;
        const row = d.records?.find((r: any) => r.submission_id == id);
        if (row)
          setValue({
            ...row,
            next_followup_at: row.next_followup_at
              ? new Date(row.next_followup_at).toISOString().slice(0, 16)
              : "",
          });
        else
          setValue({
            state: "new",
            public_message: "",
            note: "",
            actor: "",
            next_followup_at: "",
            revision: "absent",
          });
        setLoaded(true);
        setConflict(false);
      })
      .catch(() => {
        if (active)
          setMessage(
            "Could not load saved follow-up. Reload before editing or saving.",
          );
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, opened, reload]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/admin/inquiry-followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-followup-version": "1",
        },
        body: JSON.stringify({
          ...value,
          submission_id: id,
          next_followup_at: value.next_followup_at
            ? new Date(value.next_followup_at + "Z").toISOString()
            : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 409) setConflict(true);
        throw Error(d.error);
      }
      setMessage("Outcome saved. No message was sent.");
      setReload((n) => n + 1);
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
        {!loaded && (
          <p role="status">Load the saved follow-up before making changes.</p>
        )}
        <fieldset disabled={busy || !loaded} className="grid gap-3">
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
            Private evidence / note for staff
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
            Customer update (optional; visible on their private progress page)
            <textarea
              className="input-field block w-full"
              maxLength={1000}
              value={value.public_message || ""}
              onChange={(e) =>
                setValue({ ...value, public_message: e.target.value })
              }
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
          <button
            disabled={busy || !loaded || conflict}
            className="btn-secondary"
          >
            {busy ? "Saving…" : "Save outcome"}
          </button>
        </fieldset>
        {message && <p role="status">{message}</p>}
        {(!loaded || conflict) && (
          <button
            type="button"
            disabled={busy}
            className="btn-secondary"
            onClick={() => {
              setMessage("Loading saved version…");
              setReload((n) => n + 1);
            }}
          >
            Reload saved version{conflict ? " (replaces this draft)" : ""}
          </button>
        )}
      </form>
    </details>
  );
}
