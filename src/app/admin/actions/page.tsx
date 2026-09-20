"use client";
import { useEffect, useState } from "react";
import ReviewHistory from "@/components/ReviewHistory";
export default function Actions() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(""),
    [filter, setFilter] = useState("all"),
    [kind, setKind] = useState("all"),
    [drafts, setDrafts] = useState<Record<string, any>>({});
  async function load() {
    const r = await fetch("/api/admin/actions", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
    setError("");
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  const change = (item: any, k: string, v: any) => {
    setDrafts((old) => ({ ...old, [item.key]: { ...old[item.key], [k]: v } }));
    setMessage("");
  };
  async function save(item: any) {
    setBusy(item.key);
    setError("");
    setMessage("");
    try {
      const d = drafts[item.key] || {},
        due =
          d.due_at === undefined
            ? item.custom_due_at
            : d.due_at
              ? new Date(d.due_at + "Z").toISOString()
              : null;
      const r = await fetch("/api/admin/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: item.kind,
          record_id: item.record_id,
          version: item.version,
          assigned_to:
            d.assigned_to === undefined
              ? item.assigned_to
              : d.assigned_to || null,
          workflow: d.workflow || item.workflow,
          note: d.note ?? item.note,
          due_at: due,
        }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setDrafts((old) => {
        const next = { ...old };
        delete next[item.key];
        return next;
      });
      setMessage(item.title + ": assignment and follow-up saved.");
      try {
        await load();
      } catch {
        setError(
          "Your task was saved, but the queue could not refresh. Refresh before editing again.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy("");
    }
  }
  const rows = (data?.items || []).filter(
    (r: any) =>
      (kind === "all" || r.kind === kind) &&
      (filter === "all" ||
        (filter === "overdue" && r.overdue) ||
        (filter === "unassigned" && (!r.assigned_to || !r.assignee_active)) ||
        (filter === "mine" && r.assigned_to === data.identity?.id)),
  );
  return (
    <div className="max-w-6xl space-y-5 text-gray-100">
      <div className="flex flex-wrap gap-3 justify-between">
        <h1 className="text-2xl font-bold">Staff action queue</h1>
        <button
          className="btn-secondary"
          disabled={!!busy}
          onClick={() => {
            setDrafts({});
            void load().catch((e) => setError(e.message));
          }}
        >
          Refresh queue
        </button>
      </div>
      <p>
        Review applications, owner updates, inquiries and pilot activity in one
        place. Urgent delivery issues appear first, then overdue work.
        Assignments coordinate staff work; decisions and outcomes are saved in
        the linked review screens.
      </p>
      {error && (
        <p role="alert" className="bg-red-50 text-red-800 border rounded p-3">
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="bg-green-50 text-green-900 border rounded p-3"
        >
          {message}
        </p>
      )}
      {!data && !error && <p>Loading current tasks…</p>}
      {data && (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              ["Open tasks", data.items.length],
              ["Overdue", data.items.filter((i: any) => i.overdue).length],
              [
                "Unassigned / inactive assignee",
                data.items.filter(
                  (i: any) => !i.assigned_to || !i.assignee_active,
                ).length,
              ],
            ].map(([label, count]) => (
              <div key={String(label)} className="card p-4 text-gray-900">
                <p>{label}</p>
                <strong className="text-2xl">{count}</strong>
              </div>
            ))}
          </div>
          {data.warnings.map((w: string) => (
            <p
              role="alert"
              className="bg-amber-50 text-amber-900 border rounded p-3"
              key={w}
            >
              {w}
            </p>
          ))}
          {!data.staff.length && (
            <p className="bg-blue-50 text-blue-900 border rounded p-3">
              Enroll individual staff accounts in{" "}
              <a href="/admin/security" className="underline">
                Staff sign-in security
              </a>{" "}
              to enable assignments. Tasks can still be reviewed and given due
              dates.
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            <label>
              Show
              <select
                className="input-field block"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All open tasks</option>
                <option value="overdue">Overdue</option>
                <option value="unassigned">Needs assignment</option>
                <option value="mine" disabled={!data.identity?.id}>
                  Assigned to me
                </option>
              </select>
            </label>
            <label>
              Type
              <select
                className="input-field block"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="all">All types</option>
                {[
                  "application",
                  "claim",
                  "inquiry",
                  "pilot",
                  "notification",
                  "operation",
                ].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm">
            {rows.length} matching tasks · checked{" "}
            {new Date(data.checked_at).toLocaleString()}. Default review
            deadlines use elapsed hours; custom dates below use UTC. Waiting
            tasks remain visible.
          </p>
          {rows.map((item: any) => {
            const d = drafts[item.key] || {};
            return (
              <article
                key={item.key}
                className="card p-5 space-y-3 text-gray-900"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <span
                    className={
                      item.priority === "urgent" || item.overdue
                        ? "text-red-700 font-semibold"
                        : "text-gray-700"
                    }
                  >
                    {item.priority === "urgent" ? "Urgent · " : ""}
                    {item.overdue
                      ? "Overdue"
                      : item.workflow.replaceAll("_", " ")}
                  </span>
                </div>
                <p>{item.reason}</p>
                <p className="text-sm">
                  {item.kind} · source status: {item.source_status} · due:{" "}
                  {item.due_at
                    ? new Date(item.due_at).toLocaleString()
                    : "Not set"}
                </p>
                {item.assigned_to && !item.assignee_active && (
                  <p className="text-red-700">
                    The assigned staff account is inactive. Reassign this task.
                  </p>
                )}
                <a
                  className="inline-block underline font-semibold"
                  href={item.href}
                >
                  Open{" "}
                  {item.kind === "claim"
                    ? "ownership/profile review"
                    : item.kind === "inquiry"
                      ? "inquiry and outcome"
                      : item.kind === "application"
                        ? "application review"
                        : item.kind === "pilot"
                          ? "pilot review"
                          : "operations evidence"}
                </a>
                <form
                  className="grid gap-3 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(item);
                  }}
                >
                  <label>
                    Assigned staff
                    <select
                      className="input-field block w-full"
                      value={d.assigned_to ?? item.assigned_to ?? ""}
                      onChange={(e) =>
                        change(item, "assigned_to", e.target.value)
                      }
                    >
                      <option value="">Unassigned</option>
                      {item.assigned_to && !item.assignee_active && (
                        <option value={item.assigned_to} disabled>
                          {item.assignee} (inactive)
                        </option>
                      )}
                      {data.staff.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.display_name} ({s.username})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Work status
                    <select
                      className="input-field block w-full"
                      value={d.workflow || item.workflow}
                      onChange={(e) => change(item, "workflow", e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="waiting">Waiting for a reply</option>
                    </select>
                  </label>
                  <label>
                    Custom follow-up date (UTC)
                    <input
                      type="datetime-local"
                      className="input-field block w-full"
                      value={
                        d.due_at ??
                        (item.custom_due_at
                          ? new Date(item.custom_due_at)
                              .toISOString()
                              .slice(0, 16)
                          : "")
                      }
                      onChange={(e) => change(item, "due_at", e.target.value)}
                    />
                  </label>
                  <label>
                    Work note
                    <textarea
                      required
                      minLength={10}
                      maxLength={1500}
                      className="input-field block w-full"
                      value={d.note ?? item.note}
                      onChange={(e) => change(item, "note", e.target.value)}
                    />
                  </label>
                  <button
                    className="btn-secondary justify-self-start"
                    disabled={!!busy}
                  >
                    {busy === item.key
                      ? "Saving…"
                      : "Save assignment and follow-up"}
                  </button>
                </form>
                <ReviewHistory kind="action-task" id={item.key} />
              </article>
            );
          })}
          {!rows.length && <p>No matching tasks in the loaded sources.</p>}
        </>
      )}
    </div>
  );
}
