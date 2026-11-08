import { createHmac, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import { rfqConfig, UUID } from "./directory-rfq";
import { InputError } from "./onboarding";
import { listingHash } from "./listing-freshness";
import { lockOwner } from "./owner-access";
export function quoteSetupToken(id: string) {
  return (
    id +
    "." +
    createHmac("sha256", rfqConfig().secret)
      .update("owner-quote-setup-v1:" + id)
      .digest("base64url")
  );
}
export function readQuoteSetupToken(token: unknown) {
  if (typeof token !== "string" || token.length > 150)
    throw new InputError("Invalid delivery test link.", 401);
  const [id, sig, extra] = token.split(".");
  if (!UUID.test(id) || !sig || extra !== undefined)
    throw new InputError("Invalid delivery test link.", 401);
  const a = Buffer.from(sig),
    b = Buffer.from(quoteSetupToken(id).split(".")[1]);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new InputError("Invalid delivery test link.", 401);
  return id;
}
export async function ownerSetupStatus(
  db: Pick<Pool, "query">,
  shop: any,
  owner: any,
) {
  const held = !!(
    await db.query(
      "SELECT installer_id FROM directory_shop_pilot WHERE installer_id=$1 AND decision IN ('paused','declined')",
      [shop.id],
    )
  ).rows[0];
  const row = (
    await db.query(
      `SELECT s.*,n.state AS delivery_state,directory_quote_setup_eligible(s.id,true) AS ready,
 directory_quote_setup_eligible(s.id,false) AS awaiting
 FROM directory_owner_quote_setup s LEFT JOIN directory_notifications n ON n.event_key='owner-setup:'||s.id::text
 WHERE s.installer_id=$1 AND s.grant_id=$2 ORDER BY s.created_at DESC LIMIT 1`,
      [shop.id, owner.id],
    )
  ).rows[0];
  return {
    recipient: owner.email,
    services_confirmed: !!row?.ready || !!row?.awaiting,
    participation_confirmed: !!row?.ready || !!row?.awaiting,
    delivery_state: row?.delivery_state || null,
    test_confirmed: !!row?.ready,
    awaiting_test: !!row?.awaiting,
    expires_at: row?.awaiting ? row.expires_at : null,
    enabled: shop.quote_routing_enabled === true,
    paused: shop.owner_inquiry_paused === true,
    staff_hold: held,
    can_request:
      !held &&
      shop.status === "active" &&
      !shop.owner_inquiry_paused &&
      !["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"].includes(
        shop.google_status,
      ) &&
      shop.install_capabilities?.length > 0 &&
      !row?.ready &&
      !row?.awaiting &&
      (!row || Date.now() - new Date(row.created_at).getTime() >= 86400000),
  };
}
export async function requestQuoteSetup(pool: Pool, owner: any, body: any) {
  if (
    !UUID.test(body.request_id || "") ||
    body.confirm_services !== true ||
    body.confirm_participation !== true ||
    body.confirm_test !== true
  )
    throw new InputError(
      "Confirm your services, participation, and permission for one labeled delivery test.",
    );
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await lockOwner(c, owner);
    const shop = (
      await c.query("SELECT * FROM installers WHERE id=$1 FOR UPDATE", [
        owner.installer_id,
      ])
    ).rows[0];
    const previous = (
      await c.query("SELECT * FROM directory_owner_quote_setup WHERE id=$1", [
        body.request_id,
      ])
    ).rows[0];
    if (previous) {
      if (
        previous.grant_id !== owner.id ||
        previous.installer_id !== owner.installer_id ||
        previous.grant_version !== owner.version
      )
        throw new InputError("Request reference already used.", 409);
      await c.query("COMMIT");
      return {
        success: true,
        message:
          "Your setup request is saved. Check its delivery status in your shop dashboard.",
      };
    }
    if (!shop || body.snapshot_hash !== listingHash(shop))
      throw new InputError(
        "Refresh and confirm the current shop details.",
        409,
      );
    const status = await ownerSetupStatus(c as any, shop, owner);
    if (!status.can_request)
      throw new InputError(
        "Complete the current test, confirm your services and availability, or contact B2B support before requesting another test.",
        409,
      );
    const count = (
      await c.query(
        "SELECT count(*)::int n FROM directory_owner_quote_setup WHERE installer_id=$1 AND created_at>NOW()-INTERVAL '7 days'",
        [shop.id],
      )
    ).rows[0].n;
    if (count >= 3)
      throw new InputError(
        "Contact B2B support after three setup tests in seven days.",
        429,
      );
    await c.query(
      "UPDATE directory_owner_quote_setup SET cancelled_at=NOW() WHERE installer_id=$1 AND cancelled_at IS NULL",
      [shop.id],
    );
    await c.query(
      `INSERT INTO directory_owner_quote_setup(id,installer_id,grant_id,grant_version,recipient,shop_snapshot,services)
    SELECT $1,i.id,$3,$4,$5,directory_shop_identity(i),i.install_capabilities FROM installers i WHERE i.id=$2`,
      [
        body.request_id,
        shop.id,
        owner.id,
        owner.version,
        owner.email.toLowerCase(),
      ],
    );
    await c.query(
      `INSERT INTO directory_notifications(event_key,kind,record_id,recipient,reference,outcome,public_message)
    VALUES($1,'owner-setup',$2,$3,$4,'quote_setup_test',$5)`,
      [
        "owner-setup:" + body.request_id,
        body.request_id,
        owner.email.toLowerCase(),
        "SETUP-" + body.request_id.slice(0, 8).toUpperCase(),
        "Shop: " + shop.business_name,
      ],
    );
    await c.query(
      `INSERT INTO directory_review_audit(kind,record_id,actor,action,note,after_data) VALUES('owner-setup',$1,$2,'participation_requested','Owner confirmed services, availability, participation and one labeled delivery test. Routing remains unchanged.',$3)`,
      [
        shop.id,
        "owner:" + owner.id,
        JSON.stringify({
          setup_id: body.request_id,
          services: shop.install_capabilities,
        }),
      ],
    );
    await c.query("COMMIT");
    return {
      success: true,
      message:
        "Your labeled delivery test is queued for your approved business email. Confirm receipt using its private link. Vicrez will review participation before enabling new quote requests.",
    };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function confirmQuoteSetup(
  pool: Pool,
  id: string,
  confirm: boolean,
) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const row = (
      await c.query(
        `SELECT s.*,i.business_name FROM directory_owner_quote_setup s JOIN installers i ON i.id=s.installer_id WHERE s.id=$1`,
        [id],
      )
    ).rows[0];
    if (!row) throw new InputError("Delivery test unavailable.", 401);
    await c.query(
      "SELECT id FROM directory_owner_grants WHERE id=$1 FOR UPDATE",
      [row.grant_id],
    );
    await c.query("SELECT id FROM installers WHERE id=$1 FOR UPDATE", [
      row.installer_id,
    ]);
    await c.query(
      "SELECT id FROM directory_owner_quote_setup WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (
      !(
        await c.query("SELECT directory_quote_setup_eligible($1,false) ok", [
          id,
        ])
      ).rows[0].ok
    )
      throw new InputError(
        "This test expired, was already confirmed, or your shop details changed. Return to your shop dashboard or contact B2B support.",
        409,
      );
    if (confirm) {
      await c.query(
        "UPDATE directory_owner_quote_setup SET confirmed_at=NOW() WHERE id=$1",
        [id],
      );
      await c.query(
        `INSERT INTO directory_review_audit(kind,record_id,actor,action,note,after_data) VALUES('owner-setup',$1,$2,'delivery_test_confirmed','Owner explicitly confirmed receipt of the agreed setup test. Routing remains unchanged.',$3)`,
        [
          row.installer_id,
          "owner:" + row.grant_id,
          JSON.stringify({ setup_id: id }),
        ],
      );
      const key = "pilot:" + row.installer_id;
      await c.query(
        `INSERT INTO directory_action_assignments(task_key,kind,record_id,due_at,workflow,note,actor) VALUES($1,'pilot',$2,NOW(),'open','Owner completed the quote setup checklist and delivery test. Review participation, recipient suppressions and contact settings before enabling quotes.','Owner setup') ON CONFLICT(task_key) DO NOTHING`,
        [key, row.installer_id],
      );
      await c.query(
        `INSERT INTO directory_shop_pilot(installer_id,decision,evidence) VALUES($1,'candidate','{}') ON CONFLICT(installer_id) DO NOTHING`,
        [row.installer_id],
      );
    }
    await c.query("COMMIT");
    return {
      business_name: row.business_name,
      confirmed: confirm,
      expires_at: row.expires_at,
    };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
