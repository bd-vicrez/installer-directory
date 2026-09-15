import { getPool } from "./db";
import { InputError, textField, webLink, emailField } from "./onboarding";
import { randomUUID } from "node:crypto";
const allowed = [
  "business_name",
  "street_address",
  "city",
  "state",
  "zip_code",
  "phone",
  "email",
  "website",
  "install_capabilities",
  "shop_type",
  "specialize_in",
  "source",
  "status",
];
export function installerUpdates(body: Record<string, any>) {
  const changes: Record<string, any> = {};
  for (const k of allowed) {
    if (body[k] === undefined) continue;
    if (k === "install_capabilities") {
      let caps = body[k];
      if (typeof caps === "string")
        caps = caps
          .split(/[,;|]/)
          .map((s: string) => s.trim())
          .filter(Boolean);
      if (
        !Array.isArray(caps) ||
        caps.length > 30 ||
        caps.some((s: any) => typeof s !== "string" || s.length > 150)
      )
        throw new InputError("Check services.");
      changes[k] = caps;
    } else if (k === "website") changes[k] = webLink(body[k]);
    else if (k === "email") changes[k] = body[k] ? emailField(body[k]) : "";
    else
      changes[k] = textField(
        body[k],
        k,
        ["business_name", "city", "state"].includes(k) ? 2 : 0,
        500,
      );
  }
  if (
    changes.status &&
    !["active", "removed", "non_us_excluded"].includes(changes.status)
  )
    throw new InputError("Invalid listing status.");
  if (changes.state) {
    changes.state = changes.state.toUpperCase();
    if (!/^[A-Z]{2}$/.test(changes.state))
      throw new InputError("Invalid state.");
  }
  if (changes.zip_code && !/^\d{5}(?:-\d{4})?$/.test(changes.zip_code))
    throw new InputError("Invalid ZIP.");
  return changes;
}
export async function mutateInstallers(
  ids: string[],
  body: Record<string, any>,
  create = false,
) {
  if (
    !create &&
    (!ids.length ||
      ids.length > 100 ||
      ids.some((id) => typeof id !== "string" || id.length > 80))
  )
    throw new InputError("Select up to 100 listings.");
  const changes = installerUpdates(body);
  if (!Object.keys(changes).length) throw new InputError("No valid changes.");
  const db = await getPool().connect();
  await db.query("BEGIN");
  try {
    const before = create
      ? []
      : (
          await db.query(
            "SELECT * FROM installers WHERE id=ANY($1::text[]) FOR UPDATE",
            [ids],
          )
        ).rows;
    if (!create && before.length !== new Set(ids).size)
      throw new InputError("Listing not found.", 404);
    let rows: any[];
    if (create) {
      if (!changes.business_name || !changes.city || !changes.state)
        throw new InputError("Business name, city and state required.");
      const id = randomUUID(),
        slug = [
          changes.business_name,
          changes.city,
          changes.state,
          id.slice(0, 8),
        ]
          .join("-")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      const data = { id, slug, phone: "", zip_code: "", ...changes };
      const keys = Object.keys(data);
      rows = (
        await db.query(
          `INSERT INTO installers(${keys.join(",")},legacy_id,date_added,updated_at) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")},nextval('directory_installer_number')::text,NOW()::text,NOW()) RETURNING *`,
          Object.values(data),
        )
      ).rows;
    } else {
      const keys = Object.keys(changes),
        values = Object.values(changes);
      const fields = keys.map((k, i) => k + "=$" + (i + 1));
      const addressChanged = before.some((row) =>
        ["street_address", "city", "state", "zip_code"].some(
          (k) => changes[k] !== undefined && changes[k] !== row[k],
        ),
      );
      if (addressChanged)
        fields.push("lat=NULL", "lng=NULL", "location_evidence=NULL");
      fields.push("updated_at=NOW()");
      rows = (
        await db.query(
          `UPDATE installers SET ${fields.join(",")} WHERE id=ANY($${values.length + 1}::text[]) RETURNING *`,
          [...values, ids],
        )
      ).rows;
    }
    for (const row of rows) {
      await db.query(
        "INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES('installer',$1,$2,$3,$4,$5,$6)",
        [
          row.id,
          process.env.ADMIN_USERNAME || "admin",
          create ? "create" : "update",
          textField(body.review_note, "review note", 0, 1500) ||
            "Authenticated installer editor",
          JSON.stringify(before.find((r) => r.id === row.id) || null),
          JSON.stringify(row),
        ],
      );
      if (row.status === "active" && (row.lat == null || row.lng == null))
        await db.query(
          "INSERT INTO directory_data_review(id,installer_id,issue) VALUES($1,$2,'Business address needs location review') ON CONFLICT(id) DO NOTHING",
          ["location-" + row.id, row.id],
        );
    }
    await db.query("COMMIT");
    return rows;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
