import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getPool } from '@/lib/db';
import { validBusinessEmail } from '@/lib/installer-contact';
import { sameOrigin } from '@/lib/directory-rfq';
import { refreshContactPages } from '@/lib/contact-refresh';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control':'private, no-store' };
const fields = 'id,slug,business_name,status,routing_email,quote_routing_enabled,quote_routing_basis,public_email,public_email_approved,public_email_approved_at,public_email_approval_note';
export async function GET(request: NextRequest) {
  const authError = requireAdmin(request); if (authError) return authError;
  const query = request.nextUrl.searchParams.get('shop')?.trim();
  if (!query || query.length>180) return NextResponse.json({error:'Enter a shop ID or profile slug.'},{status:400,headers});
  try {
    const {rows} = await getPool().query(`SELECT ${fields} FROM installers WHERE id::text=$1 OR slug=$1 LIMIT 1`,[query]);
    return rows[0] ? NextResponse.json(rows[0],{headers}) : NextResponse.json({error:'Shop not found.'},{status:404,headers});
  } catch { return NextResponse.json({error:'Contact settings unavailable.'},{status:503,headers}); }
}
export async function POST(request: NextRequest) {
  const authError = requireAdmin(request); if (authError) return authError;
  if (!sameOrigin(request)) return NextResponse.json({error:'Open this form in the admin site.'},{status:403,headers});
  let body;
  try { const raw=await request.text(); if(raw.length>4096) throw new Error(); body=JSON.parse(raw); }
  catch { return NextResponse.json({error:'Invalid contact settings.'},{status:400,headers}); }
  if (!body || typeof body.id!=='string' || body.id.length>80 || typeof body.routing_email!=='string' || typeof body.public_email!=='string' || typeof body.quote_routing_enabled!=='boolean' || typeof body.public_email_approved!=='boolean' || typeof body.note!=='string' || body.note.trim().length<10 || body.note.length>500 || (body.routing_email && !validBusinessEmail(body.routing_email)) || (body.public_email && !validBusinessEmail(body.public_email)) || (body.quote_routing_enabled && !body.routing_email) || (body.public_email_approved && !body.public_email)) return NextResponse.json({error:'Check the email fields and include a record of the shop’s permission or requested change (10–500 characters).'},{status:400,headers});
  const client=await getPool().connect();
  let slug='';
  try {
    await client.query('BEGIN');
    const {rows}=await client.query(`UPDATE installers SET routing_email=$2,quote_routing_enabled=$3,
      quote_routing_basis='admin-reviewed',public_email=$4,public_email_approved=$5,
      public_email_approved_at=CASE WHEN $5 THEN NOW() ELSE NULL END,public_email_approval_note=$6,updated_at=NOW()
      WHERE id::text=$1 RETURNING ${fields}`,[body.id,body.routing_email.trim()||null,body.quote_routing_enabled,body.public_email.trim()||null,body.public_email_approved,body.note.trim()]);
    if(!rows[0]) { await client.query('ROLLBACK'); return NextResponse.json({error:'Shop not found.'},{status:404,headers}); }
    await client.query('INSERT INTO installer_contact_audit(installer_id,actor,action,note) VALUES($1,$2,$3,$4)',[body.id,process.env.ADMIN_USERNAME||'admin','contact-permissions-updated',body.note.trim()]);
    await client.query('COMMIT'); slug=rows[0].slug;
    refreshContactPages(slug);
    return NextResponse.json({saved:true,...rows[0]},{headers});
  } catch {
    await client.query('ROLLBACK');
    return NextResponse.json({error:'Contact settings could not be confirmed. Reload the shop before retrying.'},{status:503,headers});
  } finally { client.release(); }
}
