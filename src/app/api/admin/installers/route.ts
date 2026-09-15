import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminIdentity } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/directory-rfq";
import { InputError, readSmallJson } from "@/lib/onboarding";
import { mutateInstallers } from "@/lib/admin-installer-mutation";
import { refreshContactPages } from "@/lib/contact-refresh";
import { getPool } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const state = searchParams.get("state") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "0");
  const limit = parseInt(searchParams.get("limit") || "50");
  if (
    !Number.isInteger(page) ||
    page < 0 ||
    page > 10000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    return NextResponse.json({ error: "Invalid page." }, { status: 400 });
  const offset = page * limit;

  const db = getPool();
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (search) {
    conditions.push(
      `(business_name ILIKE $${paramIdx} OR city ILIKE $${paramIdx} OR state ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`,
    );
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (state) {
    conditions.push(`state = $${paramIdx}`);
    params.push(state);
    paramIdx++;
  }

  if (status) {
    conditions.push(`status = $${paramIdx}`);
    params.push(status);
    paramIdx++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM installers ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total);

  // Get paginated results
  const dataResult = await db.query(
    `SELECT * FROM installers ${whereClause} ORDER BY id DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset],
  );

  return NextResponse.json({
    installers: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin.", 403);
    const rows = await mutateInstallers(
      [],
      await readSmallJson(request),
      true,
      adminIdentity?.(request)?.username,
    );
    refreshContactPages(rows[0].slug);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof InputError ? e.message : "Creation unavailable." },
      { status: e instanceof InputError ? e.status : 503 },
    );
  }
}
