import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { InputError, textField, ownerDetails } from "./onboarding";
export async function reviewApplication(
  pool: Pool,
  id: string,
  body: Record<string, any>,
) {
  const status = body.status;
  if (
    !["approved", "rejected", "needs_information", "pending"].includes(status)
  )
    throw new InputError("Choose a review status.");
  const client = await pool.connect();
  await client.query("BEGIN");
  try {
    const app = (
      await client.query("SELECT * FROM applications WHERE id=$1 FOR UPDATE", [
        id,
      ])
    ).rows[0];
    if (!app) throw new InputError("Application not found.", 404);
    if (app.status === "approved") {
      if (status !== "approved")
        throw new InputError(
          "Use the listing review workflow for an approved application.",
          409,
        );
      await client.query("COMMIT");
      return {
        success: true,
        installer_id: app.installer_id,
        already_reviewed: true,
      };
    }
    if (
      app.status === "rejected" &&
      status !== "pending" &&
      status !== "rejected"
    )
      throw new InputError("Reopen this application before approval.", 409);
    let installerId = app.installer_id,
      slug = "";
    if (status === "approved") {
      const loc = app.location_evidence;
      if (
        !loc?.eligible ||
        !Number.isFinite(loc.lat) ||
        !Number.isFinite(loc.lng) ||
        body.confirm_location !== true
      )
        throw new InputError(
          "Look up and confirm the full business address before publishing.",
        );
      if (body.confirm_identity !== true || body.confirm_duplicates !== true)
        throw new InputError(
          "Confirm business identity and review duplicate candidates.",
        );
      installerId = randomUUID();
      slug =
        [app.business_name, app.city, app.state]
          .join("-")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        installerId.slice(0, 8);
      const inquiry =
        app.details?.inquiry_consent === true &&
        body.confirm_inquiry_contact === true;
      const publish = body.confirm_publish === true;
      await client.query(
        `INSERT INTO installers(id,legacy_id,business_name,slug,street_address,city,state,zip_code,phone,email,website,install_capabilities,source,status,date_added,updated_at,lat,lng,location_evidence,routing_email,quote_routing_enabled,quote_routing_basis,service_source,owner_details,owner_details_confirmed_at)
    VALUES($1,nextval('directory_installer_number')::text,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'[Installer Application]','active',NOW()::text,NOW(),$12,$13,$14,$15,$16,$17,'Shop application; reviewed business identity, self-declared services',$18,CASE WHEN $19 THEN NOW() ELSE NULL END)`,
        [
          installerId,
          app.business_name,
          slug,
          app.street_address,
          app.city,
          app.state,
          app.zip_code,
          app.phone,
          app.email,
          app.website,
          app.install_capabilities,
          loc.lat,
          loc.lng,
          JSON.stringify(loc),
          inquiry ? app.email : null,
          inquiry,
          inquiry ? "Application opt-in and reviewer confirmation" : null,
          JSON.stringify(publish ? ownerDetails(app.details || {}) : {}),
          publish,
        ],
      );
    }
    const message = textField(
      body.public_message,
      "applicant status message",
      0,
      500,
    );
    await client.query(
      "UPDATE applications SET status=$1,reviewer=$2,review_note=$3,public_message=$4,reviewed_at=NOW(),installer_id=$5,location_confirmed_at=CASE WHEN $1='approved' THEN NOW() ELSE location_confirmed_at END WHERE id=$6",
      [status, body.reviewer, body.note, message, installerId, id],
    );
    await client.query(
      "INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES('application',$1,$2,$3,$4,$5,$6)",
      [
        id,
        body.reviewer,
        status,
        body.note,
        JSON.stringify({ status: app.status, installer_id: app.installer_id }),
        JSON.stringify({
          status,
          installer_id: installerId,
          location: app.location_evidence,
          public_message: message,
        }),
      ],
    );
    await client.query("COMMIT");
    return { success: true, installer_id: installerId, slug };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
