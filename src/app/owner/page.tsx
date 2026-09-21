"use client";
import { useEffect, useRef, useState } from "react";
import ListingReconfirmation from "@/components/ListingReconfirmation";
import ShopProjectsEditor from "@/components/ShopProjectsEditor";
import OwnerDetailsFields from "@/components/OwnerDetailsFields";
export default function OwnerPortal() {
  const [data, setData] = useState<any>(null),
    [loaded, setLoaded] = useState(false),
    [token, setToken] = useState(""),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [values, setValues] = useState<any>({}),
    [ids, setIds] = useState<string[]>([]),
    [correction, setCorrection] = useState(""),
    [agreement, setAgreement] = useState(false),
    [caption, setCaption] = useState(""),
    [permission, setPermission] = useState(false),
    [file, setFile] = useState<File | null>(null);
  const [confirmProjects, setConfirmProjects] = useState(false);
  const requestId = useRef("");
  async function api(url: string, body?: any, method = "POST") {
    const r = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Unable to complete this request.");
    return d;
  }
  async function load(reset = false) {
    const r = await fetch("/api/owner/shop", { cache: "no-store" });
    const d = await r.json();
    if (r.status === 401) {
      setData(null);
      setLoaded(true);
      return;
    }
    if (!r.ok) throw Error(d.error);
    setData(d);
    if (reset) {
      setValues(d.shop.owner_details || {});
      setIds(d.shop.owner_details?.photo_ids || []);
    }
    setLoaded(true);
  }
  useEffect(() => {
    const raw = location.hash.slice(1);
    if (raw) {
      setToken(raw);
      history.replaceState(null, "", location.pathname);
      setLoaded(true);
      return;
    }
    void load(true).catch((e) => {
      setError(e.message);
      setLoaded(true);
    });
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  const pending = data?.requests?.some((r: any) =>
    ["pending", "needs_information", "verified"].includes(r.status),
  );
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manage your shop</h1>
      <p>
        Keep your profile useful and control new installation inquiries. Profile
        changes and project photos are reviewed before publication.
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
      {!loaded ? (
        <p>Loading your access…</p>
      ) : !data ? (
        <section className="border rounded-xl p-5 space-y-4">
          {token ? (
            <>
              <h2 className="text-xl font-semibold">
                Your private sign-in link
              </h2>
              <p>
                Continue to open a 12-hour session on this device. Each emailed
                link can be used once.
              </p>
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api("/api/owner/auth", { action: "exchange", token });
                    setToken("");
                    await load(true);
                  })
                }
              >
                Continue to my shop
              </button>
              <button
                className="btn-secondary ml-2"
                disabled={busy}
                onClick={() => setToken("")}
              >
                Request another link
              </button>
            </>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const d = await api("/api/owner/auth", {
                    action: "request",
                    email,
                  });
                  setMessage(d.message);
                });
              }}
            >
              <h2 className="text-xl font-semibold">Owner sign-in</h2>
              <label className="block">
                Approved business email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={255}
                  className="input-field w-full mt-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button className="btn-primary" disabled={busy}>
                {busy ? "Please wait…" : "Email a private sign-in link"}
              </button>
              <p className="text-sm">
                First-time access requires a reviewed ownership request.{" "}
                <a className="underline" href="/claim">
                  Claim or update a listing
                </a>
                , or email{" "}
                <a href="mailto:support@vicrez.com" className="underline">
                  support@vicrez.com
                </a>
                .
              </p>
            </form>
          )}
        </section>
      ) : (
        <>
          <section className="border rounded-xl p-5 space-y-3">
            <h2 className="text-2xl font-semibold">
              {data.shop.business_name}
            </h2>
            <a
              href={"/installer/" + data.shop.slug}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View public profile
            </a>
            <p>
              <strong>New inquiries:</strong>{" "}
              {data.shop.paused
                ? "Paused by your shop"
                : data.shop.accepting
                  ? "Available"
                  : "Not enabled — contact Vicrez to review participation and the delivery address"}
            </p>
            <p className="text-sm">
              Pausing takes effect for new requests immediately. Existing
              inquiry response links stay usable. Resuming keeps Vicrez’s
              contact and participation requirements in place.
            </p>
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const d = await api("/api/owner/shop", {
                    action: "availability",
                    paused: !data.shop.paused,
                  });
                  await load();
                  setMessage(
                    d.paused
                      ? "New inquiries are paused."
                      : d.accepting
                        ? "New inquiries are available again."
                        : "Your pause is cleared. Vicrez must still enable inquiry participation.",
                  );
                })
              }
            >
              {data.shop.paused
                ? "Resume new inquiries"
                : "Pause new inquiries"}
            </button>
            <button
              className="btn-secondary ml-2"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("/api/owner/auth", undefined, "DELETE");
                  setData(null);
                })
              }
            >
              Sign out
            </button>
          </section>
          <ListingReconfirmation
            snapshot={data.shop.snapshot}
            hash={data.shop.snapshot_hash}
            freshness={data.shop.freshness}
            onSaved={() => load()}
          />
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                if (!requestId.current) requestId.current = crypto.randomUUID();
                const d = await api("/api/owner/shop", {
                  action: "proposal",
                  ...values,
                  photo_ids: ids,
                  confirm_projects: confirmProjects,
                  correction,
                  agreement,
                  request_id: requestId.current,
                });
                requestId.current = "";
                await load();
                setMessage(
                  d.reference +
                    ": changes saved for staff review. Your public profile has not changed yet.",
                );
              });
            }}
          >
            <h2 className="text-2xl font-semibold">Propose profile changes</h2>
            {pending && (
              <p className="bg-blue-50 border rounded p-3">
                A profile update is awaiting review. See its status below.
                Contact support with the reference to add information.
              </p>
            )}
            <OwnerDetailsFields
              values={values}
              onChange={(key, value) =>
                setValues((v: any) => ({ ...v, [key]: value }))
              }
            />
            <ShopProjectsEditor
              projects={values.projects || []}
              photos={data.photos.filter((p: any) => ids.includes(p.id))}
              onChange={(projects) => {
                setValues((v: any) => ({ ...v, projects }));
                setConfirmProjects(false);
              }}
              confirmed={confirmProjects}
              onConfirm={setConfirmProjects}
            />
            <section className="border rounded-xl p-4 space-y-3">
              <h3 className="text-lg font-semibold">Project photos</h3>
              <p className="text-sm">
                Select up to six photos to propose for your public profile.
                Uploads stay private until staff reviews them. Use photos you
                own or have permission to publish; exclude customers’ faces,
                license plates, and private information.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {data.photos.map((p: any) => (
                  <figure
                    key={p.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <img
                      src={"/api/shop-photos/" + p.id}
                      alt={p.caption}
                      width={p.width}
                      height={p.height}
                      loading="lazy"
                      className="w-full h-44 object-contain bg-gray-50"
                    />
                    <figcaption>{p.caption}</figcaption>
                    <label className="flex gap-2">
                      <input
                        type="checkbox"
                        checked={ids.includes(p.id)}
                        disabled={
                          busy || (!ids.includes(p.id) && ids.length >= 6)
                        }
                        onChange={(e) =>
                          setIds((old) =>
                            e.target.checked
                              ? [...old, p.id]
                              : old.filter((id) => id !== p.id),
                          )
                        }
                      />
                      Include in proposed profile
                    </label>
                    <button
                      type="button"
                      className="text-sm underline"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await api(
                            "/api/owner/photos",
                            { id: p.id },
                            "DELETE",
                          );
                          setIds((old) => old.filter((id) => id !== p.id));
                          await load();
                          setMessage("Unused photo removed.");
                        })
                      }
                    >
                      Remove unused photo
                    </button>
                  </figure>
                ))}
              </div>
              <label className="block">
                Add a photo (JPEG, PNG or WebP, under 4 MB)
                <input
                  className="block mt-1 max-w-full"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              <label className="block">
                Describe the project
                <input
                  className="input-field w-full"
                  maxLength={200}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={permission}
                  onChange={(e) => setPermission(e.target.checked)}
                />
                I have permission to publish this photo and its caption.
              </label>
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  busy || !file || !permission || caption.trim().length < 5
                }
                onClick={() =>
                  run(async () => {
                    if (!file) return;
                    if (file.size > 4 * 1024 * 1024)
                      throw Error("Choose a photo smaller than 4 MB.");
                    const r = await fetch(
                      "/api/owner/photos?" +
                        new URLSearchParams({ caption, permission: "yes" }),
                      {
                        method: "POST",
                        headers: { "Content-Type": file.type },
                        body: file,
                      },
                    );
                    const d = await r.json();
                    if (!r.ok) throw Error(d.error);
                    await load();
                    setMessage(
                      "Photo uploaded privately. Select it above and submit your profile changes for review.",
                    );
                  })
                }
              >
                Upload private photo
              </button>
            </section>
            <label className="block">
              Summary of requested changes
              <textarea
                required
                minLength={10}
                maxLength={2000}
                className="input-field w-full"
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
              />
            </label>
            <p className="text-sm">
              Include address, contact or ownership correction requests here.
              Staff will verify these separately; they cannot be changed
              directly through this form. Never include passwords or sensitive
              documents.
            </p>
            <label className="flex gap-2">
              <input
                type="checkbox"
                required
                checked={agreement}
                onChange={(e) => setAgreement(e.target.checked)}
              />
              I am authorized to manage this business and approve publication of
              the proposed details and selected photos after review.
            </label>
            <button className="btn-primary" disabled={busy || pending}>
              {busy ? "Saving…" : "Submit profile changes for review"}
            </button>
          </form>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Your review requests</h2>
            {!data.requests.length && <p>No profile updates submitted yet.</p>}
            {data.requests.map((r: any) => (
              <article className="border rounded-lg p-4" key={r.id}>
                <p className="font-semibold">
                  CLM-{r.id.slice(0, 8).toUpperCase()} ·{" "}
                  {r.status.replaceAll("_", " ")}
                </p>
                <p>{r.correction}</p>
                {r.public_message && (
                  <p className="mt-2">Reviewer update: {r.public_message}</p>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
