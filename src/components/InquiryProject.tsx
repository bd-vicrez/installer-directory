"use client";
import { useEffect, useRef, useState } from "react";
export default function InquiryProject({
  scope,
  token,
  id,
  closed = false,
}: {
  scope: "customer" | "shop" | "staff";
  token?: string;
  id?: number;
  closed?: boolean;
}) {
  const [opened, setOpened] = useState(false),
    [photos, setPhotos] = useState<any[]>([]),
    [fields, setFields] = useState<any>({}),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [caption, setCaption] = useState(""),
    [permission, setPermission] = useState(false);
  const uploadId = useRef(""),
    urls = useRef<string[]>([]),
    generation = useRef(0);
  async function api(action: string, extra: any = {}) {
    const r = await fetch("/api/inquiry-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        token,
        submission_id: id,
        action,
        ...extra,
      }),
      cache: "no-store",
    });
    if (!r.ok) throw Error((await r.json()).error);
    return r;
  }
  async function load() {
    const ticket = ++generation.current,
      loaded: any[] = [];
    try {
      const d = await (await api("list")).json();
      for (const p of d.photos) {
        const image = await (await api("read", { photo_id: p.id })).blob();
        loaded.push({ ...p, url: URL.createObjectURL(image) });
      }
      if (ticket !== generation.current) {
        loaded.forEach((p) => URL.revokeObjectURL(p.url));
        return;
      }
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current = loaded.map((p) => p.url);
      setPhotos(loaded);
      setFields(d.project_brief.fields);
    } catch (e) {
      loaded.forEach((p) => URL.revokeObjectURL(p.url));
      throw e;
    }
  }
  useEffect(() => {
    if (opened) void load().catch((e) => setError(e.message));
    return () => {
      generation.current++;
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current = [];
    };
  }, [opened, token, id]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="border rounded-xl p-4 bg-white text-gray-900"
      onToggle={(e) => {
        if (e.currentTarget.open) setOpened(true);
      }}
    >
      <summary className="font-semibold cursor-pointer">
        Private project details and photos
      </summary>
      {opened && (
        <div className="space-y-4 mt-3">
          <p className="text-sm">
            Visible only through this private customer/shop link and to
            authorized Vicrez staff. Customer photos are never published on shop
            profiles.
          </p>
          {error && (
            <p role="alert" className="text-red-800">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <dl className="space-y-2">
            {Object.entries(fields)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="font-semibold">{k.replaceAll("_", " ")}</dt>
                  <dd className="whitespace-pre-wrap break-words">
                    {String(v)}
                  </dd>
                </div>
              ))}
          </dl>
          <div className="grid sm:grid-cols-2 gap-4">
            {photos.map((p) => (
              <figure key={p.id}>
                <img
                  src={p.url}
                  alt={p.caption || "Customer project photo"}
                  width={p.width}
                  height={p.height}
                  className="w-full h-48 object-contain bg-gray-50"
                />
                <figcaption>{p.caption}</figcaption>
                {scope === "customer" && !closed && (
                  <button
                    disabled={busy}
                    className="underline"
                    onClick={() =>
                      void run(async () => {
                        await api("delete", { photo_id: p.id });
                        await load();
                        setMessage("Photo removed from shared project access.");
                      })
                    }
                  >
                    Remove photo
                  </button>
                )}
              </figure>
            ))}
          </div>
          {!photos.length && <p>No project photos attached.</p>}
          {scope === "customer" && !closed && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  if (!file || !permission)
                    throw Error("Choose a photo and confirm permission.");
                  if (file.size > 3 * 1024 * 1024)
                    throw Error("Choose a photo smaller than 3 MB.");
                  const image = await new Promise<string>((resolve, reject) => {
                    const r = new FileReader();
                    r.onload = () => resolve(String(r.result).split(",")[1]);
                    r.onerror = reject;
                    r.readAsDataURL(file);
                  });
                  if (!uploadId.current) uploadId.current = crypto.randomUUID();
                  await api("upload", {
                    photo_id: uploadId.current,
                    image,
                    caption,
                    permission,
                  });
                  uploadId.current = "";
                  await load();
                  setMessage("Photo saved privately.");
                });
              }}
            >
              <label className="block">
                Project photo (JPEG, PNG or WebP; under 3 MB)
                <input
                  className="block max-w-full"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    uploadId.current = "";
                  }}
                />
              </label>
              <label className="block">
                What does this photo show?
                <input
                  className="input-field w-full"
                  required
                  minLength={5}
                  maxLength={200}
                  value={caption}
                  onChange={(e) => {
                    setCaption(e.target.value);
                    uploadId.current = "";
                  }}
                />
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  required
                  checked={permission}
                  onChange={(e) => setPermission(e.target.checked)}
                />
                I have permission to share this photo with the selected shops
                and Vicrez. It excludes faces, license plates and private
                documents.
              </label>
              <p className="text-sm">
                Up to three current photos and six uploads per request. Location
                metadata is removed.
              </p>
              <button
                className="btn-secondary"
                disabled={busy || photos.length >= 3}
              >
                {busy ? "Saving…" : "Upload privately"}
              </button>
            </form>
          )}
          <button
            className="underline"
            disabled={busy}
            onClick={() => void run(load)}
          >
            Refresh project
          </button>
        </div>
      )}
    </details>
  );
}
