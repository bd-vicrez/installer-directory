"use client";
import { useEffect, useState } from "react";
export default function SecurityPage() {
  const [data, setData] = useState<any>(null),
    [setup, setSetup] = useState<any>(null),
    [codes, setCodes] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [disableId, setDisableId] = useState<string | null>(null),
    [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState({
    username: "",
    display_name: "",
    password: "",
    code: "",
  });
  async function refresh() {
    const r = await fetch("/api/admin/security", { cache: "no-store" });
    if (r.ok) setData(await r.json());
    else setError("Could not load security settings.");
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function action(kind: string) {
    setBusy(true);
    setError("");
    try {
      const payload =
        kind === "start"
          ? {
              action: kind,
              username: form.username,
              display_name: form.display_name,
              password: form.password,
            }
          : kind === "confirm"
            ? {
                action: kind,
                enrollment_id: setup.enrollment_id,
                code: form.code,
              }
            : kind === "disable_user"
              ? { action: kind, id: disableId }
              : { action: kind, confirm: confirmed };
      const r = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (kind === "start") {
        setSetup(d);
        setForm((f) => ({ ...f, password: "" }));
      }
      if (kind === "confirm") {
        setSetup(null);
        setCodes(d.recovery_codes);
        setForm({ username: "", display_name: "", password: "", code: "" });
      }
      if (kind === "disable_user") setDisableId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  const ready =
    !!data?.users.filter((u: any) => u.active).length &&
    data.users
      .filter((u: any) => u.active)
      .every(
        (u: any) =>
          u.totp_login_verified_at &&
          u.recovery_verified_at &&
          u.recovery_codes_remaining > 0,
      );
  return (
    <div className="max-w-3xl space-y-6 text-gray-100 [&_.card]:text-gray-900">
      <h1 className="text-2xl font-bold">Staff sign-in security</h1>
      <p>
        Each staff member should enroll their own username, password and
        authenticator. An existing administrator must authorize access to this
        page. These accounts have directory administration access.
      </p>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {data && (
        <section className="card p-5 space-y-2">
          <p>
            Signed in as {data.identity.username}. Shared login:{" "}
            {data.named_only ? "disabled" : "available during enrollment"}.
          </p>
          {data.users.map((u: any) => (
            <div key={u.id} className="border-t pt-2">
              <p>
                {u.display_name} · {u.username} ·{" "}
                {u.active ? "active" : "disabled"}
              </p>
              {u.active && (
                <p className="text-sm">
                  Authenticator sign-in:{" "}
                  {u.totp_login_verified_at ? "verified" : "not tested"} ·
                  Recovery sign-in:{" "}
                  {u.recovery_verified_at ? "verified" : "not tested"} · Unused
                  recovery codes: {u.recovery_codes_remaining}
                </p>
              )}
              {data.identity.id &&
                data.identity.id !== u.id &&
                u.active &&
                (disableId === u.id ? (
                  <div className="space-x-3 py-2">
                    <p>
                      Disable {u.username} and revoke their existing sessions?
                    </p>
                    <button
                      className="btn-secondary"
                      disabled={busy}
                      onClick={() => void action("disable_user")}
                    >
                      Confirm disable
                    </button>
                    <button disabled={busy} onClick={() => setDisableId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="underline text-sm"
                    onClick={() => setDisableId(u.id)}
                  >
                    Disable account
                  </button>
                ))}
            </div>
          ))}
        </section>
      )}
      {codes.length > 0 ? (
        <section className="card p-5 space-y-3">
          <h2 className="font-semibold">Save these recovery codes now</h2>
          <p>
            Each code works once if you lose your authenticator. Store them in
            your password manager. They are shown only once.
          </p>
          <div className="grid sm:grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((c) => (
              <p key={c}>{c}</p>
            ))}
          </div>
          <button className="btn-secondary" onClick={() => setCodes([])}>
            I saved my recovery codes
          </button>
        </section>
      ) : setup ? (
        <form
          className="card p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void action("confirm");
          }}
        >
          <h2 className="font-semibold">Connect your authenticator</h2>
          <p>
            In your authenticator app, choose manual setup. Account: Vicrez
            Installers ({setup.account}). Use a time-based code, six digits,
            30-second interval.
          </p>
          <label className="block">
            Setup key
            <input
              readOnly
              className="input-field w-full font-mono"
              value={setup.secret}
            />
          </label>
          <p className="text-sm">
            Keep this key private. Setup expires after 15 minutes.
          </p>
          <label className="block">
            Six-digit code
            <input
              required
              pattern="[0-9]{6}"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="input-field block"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </label>
          <button disabled={busy} className="btn-primary">
            Confirm authenticator
          </button>
        </form>
      ) : (
        <form
          className="card p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void action("start");
          }}
        >
          <h2 className="font-semibold">Enroll a personal staff account</h2>
          <label className="block">
            Your name
            <input
              required
              minLength={2}
              maxLength={100}
              className="input-field w-full"
              value={form.display_name}
              onChange={(e) =>
                setForm({ ...form, display_name: e.target.value })
              }
            />
          </label>
          <label className="block">
            Personal username
            <input
              required
              minLength={3}
              maxLength={64}
              pattern="[a-zA-Z0-9._-]+"
              autoComplete="username"
              className="input-field w-full"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </label>
          <label className="block">
            New password (at least 12 characters)
            <input
              required
              minLength={12}
              maxLength={128}
              type="password"
              autoComplete="new-password"
              className="input-field w-full"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <button disabled={busy} className="btn-primary">
            Set up authenticator
          </button>
        </form>
      )}
      {data?.identity.id && !data.named_only && (
        <section className="card p-5 space-y-3">
          <h2 className="font-semibold">
            Finish the switch to personal accounts
          </h2>
          <p>
            Before disabling the shared login, enroll every staff member who
            needs access and save recovery codes. Legacy scripts must use the
            dedicated operations integration.
          </p>
          <p>
            Each person must sign out, sign in with one saved recovery code,
            then sign out and sign in with a fresh authenticator code. Recovery
            codes work once. Keep the remaining codes in a private password
            manager.
          </p>
          {!ready && (
            <p className="text-amber-800">
              Shared-login retirement is locked until both sign-in checks pass
              for every active staff account.
            </p>
          )}
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Staff are enrolled and recovery codes are saved.
          </label>
          <button
            disabled={!ready || !confirmed || busy || codes.length > 0}
            className="btn-secondary"
            onClick={() => void action("named_only")}
          >
            Disable shared login
          </button>
        </section>
      )}
    </div>
  );
}
