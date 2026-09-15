import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/directory-rfq";
import { InputError, readSmallJson, textField } from "@/lib/onboarding";
import { addressCandidate } from "@/lib/address-review";
import { reviewApplication } from "@/lib/review-application";
import { refreshContactPages } from "@/lib/contact-refresh";
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(request);
  if (auth) return auth;
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin.", 403);
    const { id } = await params,
      body = await readSmallJson(request);
    body.reviewer = textField(body.reviewer, "reviewer name", 2, 100);
    body.note = textField(body.note, "review note", 10, 1500);
    if (body.action === "address") {
      const street = textField(body.street_address, "street address", 3, 200),
        city = textField(body.city, "city", 2, 100),
        state = textField(body.state, "state", 2, 2).toUpperCase(),
        zip = textField(body.zip_code, "ZIP", 5, 10);
      if (!/^[A-Z]{2}$/.test(state) || !/^\d{5}(?:-\d{4})?$/.test(zip))
        throw new InputError("Check state and ZIP.");
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        const old = (
          await client.query(
            "SELECT * FROM applications WHERE id=$1 AND status IN ('pending','needs_information') FOR UPDATE",
            [id],
          )
        ).rows[0];
        if (!old)
          throw new InputError(
            "Only pending applications can have their address corrected.",
            409,
          );
        await client.query(
          "UPDATE applications SET street_address=$1,city=$2,state=$3,zip_code=$4,location_evidence=NULL,location_confirmed_at=NULL,reviewer=$5,review_note=$6 WHERE id=$7",
          [street, city, state, zip, body.reviewer, body.note, id],
        );
        await client.query(
          "INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES('application',$1,$2,'address-correction',$3,$4,$5)",
          [
            id,
            body.reviewer,
            body.note,
            JSON.stringify({
              street_address: old.street_address,
              city: old.city,
              state: old.state,
              zip_code: old.zip_code,
            }),
            JSON.stringify({
              street_address: street,
              city,
              state,
              zip_code: zip,
            }),
          ],
        );
        await client.query("COMMIT");
        return NextResponse.json({ success: true });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    if (body.action === "locate") {
      const app = (
        await getPool().query("SELECT * FROM applications WHERE id=$1", [id])
      ).rows[0];
      if (!app) throw new InputError("Application not found.", 404);
      const location = await addressCandidate(app);
      await getPool().query(
        "UPDATE applications SET location_evidence=$1,location_confirmed_at=NULL WHERE id=$2 AND status IN ('pending','needs_information')",
        [JSON.stringify(location), id],
      );
      return NextResponse.json({ location });
    }
    const result = await reviewApplication(getPool(), id, body);
    refreshContactPages(result.slug || "");
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Review could not be saved. Retry safely.",
      },
      { status: e instanceof InputError ? e.status : 503 },
    );
  }
}
