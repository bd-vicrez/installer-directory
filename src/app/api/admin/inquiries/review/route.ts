import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminIdentity } from "@/lib/admin-auth";
import { rfqFetch } from "@/lib/directory-rfq";
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  const headers = {"Cache-Control":"private, no-store"};
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({error:"Open this review on the site."},{status:403,headers});
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw)>4096) return NextResponse.json({error:"Review is too long."},{status:413,headers});
    const b = JSON.parse(raw), actor = adminIdentity(request)?.username;
    if (!actor) return NextResponse.json({error:"Sign in again."},{status:401,headers});
    const r = await rfqFetch("/internal/directory-rfq/intake-review", {
      submission_id:b.submission_id,action:b.action,version:b.version,
      action_id:b.action_id,note:b.note,confirmed:b.confirmed,actor,
    });
    const data = await r.json();
    return NextResponse.json(r.ok ? data : {error:data.detail || "Review could not be saved."},{status:r.status,headers});
  } catch {return NextResponse.json({error:"Review was not confirmed. Refresh before trying again."},{status:503,headers});}
}
