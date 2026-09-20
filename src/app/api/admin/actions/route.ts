import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminIdentity } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
import { InputError, readSmallJson } from "@/lib/onboarding";
import { ownerOrigin } from "@/lib/owner-access";
import { loadActionQueue, actionInput } from "@/lib/action-queue";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    return NextResponse.json(
      {
        ...(await loadActionQueue(getPool())),
        identity: adminIdentity(request),
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Action queue unavailable." },
      { status: 503, headers },
    );
  }
}
export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let client;
  try {
    ownerOrigin(request);
    const b = actionInput(await readSmallJson(request, 4000));
    const queue = await loadActionQueue(getPool()),
      source = queue.items.find((item) => item.key === b.key);
    if (!source)
      throw new InputError(
        queue.warnings.length
          ? "This task could not be confirmed. Refresh the queue before saving."
          : "This task has been resolved or is no longer in the current queue. Refresh before saving.",
        409,
      );
    const actor = adminIdentity(request)!.username;
    client = await getPool().connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(19313,hashtext($1))", [
      b.key,
    ]);
    if (["application", "claim"].includes(b.kind)) {
      const table =
        b.kind === "application" ? "applications" : "directory_claims";
      const row = (
        await client.query(
          `SELECT status FROM ${table} WHERE id::text=$1 FOR SHARE`,
          [b.record_id],
        )
      ).rows[0];
      if (
        !row ||
        !(
          b.kind === "application"
            ? ["pending", "needs_information"]
            : ["pending", "needs_information", "verified"]
        ).includes(row.status)
      )
        throw new InputError(
          "The underlying review was resolved. Refresh the queue.",
          409,
        );
    }
    if (b.assigned_to) {
      const staff = (
        await client.query(
          "SELECT id FROM directory_staff_users WHERE id=$1 AND active FOR SHARE",
          [b.assigned_to],
        )
      ).rows[0];
      if (!staff)
        throw new InputError("That staff account is no longer active.");
    }
    const prior = (
      await client.query(
        "SELECT * FROM directory_action_assignments WHERE task_key=$1 FOR UPDATE",
        [b.key],
      )
    ).rows[0];
    if ((prior?.version || 0) !== b.version)
      throw new InputError(
        "Another staff member updated this task. Refresh before saving.",
        409,
      );
    await client.query(
      `INSERT INTO directory_action_assignments(task_key,kind,record_id,assigned_to,due_at,workflow,note,actor) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(task_key) DO UPDATE SET assigned_to=EXCLUDED.assigned_to,due_at=EXCLUDED.due_at,workflow=EXCLUDED.workflow,note=EXCLUDED.note,actor=EXCLUDED.actor,version=directory_action_assignments.version+1,updated_at=NOW()`,
      [
        b.key,
        b.kind,
        b.record_id,
        b.assigned_to,
        b.due_at,
        b.workflow,
        b.note,
        actor,
      ],
    );
    await client.query(
      "INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES('action-task',$1,$2,$3,$4,$5,$6)",
      [
        b.key,
        actor,
        b.workflow,
        b.note,
        JSON.stringify(prior || null),
        JSON.stringify({ ...b, source_status: source.source_status }),
      ],
    );
    await client.query("COMMIT");
    return NextResponse.json(
      { success: true, version: b.version + 1 },
      { headers },
    );
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    return NextResponse.json(
      {
        error: e instanceof InputError ? e.message : "Task could not be saved.",
      },
      { status: e instanceof InputError ? e.status : 503, headers },
    );
  } finally {
    client?.release();
  }
}
