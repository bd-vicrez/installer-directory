"use client";
import { QUOTE_SERVICES } from "@/lib/quote-services";
export default function ShopProjectsEditor({
  projects,
  photos,
  onChange,
  confirmed,
  onConfirm,
}: {
  projects: any[];
  photos: any[];
  onChange: (v: any[]) => void;
  confirmed: boolean;
  onConfirm: (v: boolean) => void;
}) {
  const change = (i: number, k: string, v: string) =>
    onChange(projects.map((p, n) => (n === i ? { ...p, [k]: v } : p)));
  return (
    <section className="border rounded-xl p-4 space-y-4">
      <h3 className="text-lg font-semibold">Completed project examples</h3>
      <p>
        Add up to three real projects completed by your shop. Select a photo
        included in this profile proposal. Staff reviews the vehicle, service,
        description and photo together before publication.
      </p>
      {projects.map((p, i) => (
        <fieldset className="min-w-0 border rounded p-3 space-y-3" key={i}>
          <legend>Project {i + 1}</legend>
          {[
            ["vehicle", "Vehicle (year, make and model)", 120],
            ["summary", "Work your shop completed", 1000],
            ["parts", "Parts / products used (optional)", 200],
          ].map(([k, l, n]) => (
            <label className="block" key={String(k)}>
              {l}
              <textarea
                className="input-field w-full"
                required={k !== "parts"}
                minLength={k === "summary" ? 30 : k === "vehicle" ? 3 : 0}
                maxLength={Number(n)}
                value={p[String(k)] || ""}
                onChange={(e) => change(i, String(k), e.target.value)}
              />
            </label>
          ))}
          <label className="block">
            Service
            <select
              className="input-field block w-full"
              required
              value={p.service || ""}
              onChange={(e) => change(i, "service", e.target.value)}
            >
              <option value="">Choose service</option>
              {QUOTE_SERVICES.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Completed month
            <input
              type="month"
              className="input-field block w-full"
              required
              max={new Date().toISOString().slice(0, 7)}
              value={p.completed_month || ""}
              onChange={(e) => change(i, "completed_month", e.target.value)}
            />
          </label>
          <label className="block">
            Project photo
            <select
              className="input-field block w-full"
              required
              value={p.photo_id || ""}
              onChange={(e) => change(i, "photo_id", e.target.value)}
            >
              <option value="">Choose an included photo</option>
              {photos.map((photo) => (
                <option value={photo.id} key={photo.id}>
                  {photo.caption}
                </option>
              ))}
            </select>
          </label>
          <button
            className="underline"
            type="button"
            onClick={() => onChange(projects.filter((_, n) => n !== i))}
          >
            Remove project example
          </button>
        </fieldset>
      ))}
      <button
        className="btn-secondary"
        type="button"
        disabled={projects.length >= 3}
        onClick={() => onChange([...projects, {}])}
      >
        Add completed project
      </button>
      {projects.length > 0 && (
        <label className="flex gap-2">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(e) => onConfirm(e.target.checked)}
          />
          These are actual projects completed by our shop. We have permission to
          publish the descriptions and selected photos, without private customer
          information.
        </label>
      )}
    </section>
  );
}
