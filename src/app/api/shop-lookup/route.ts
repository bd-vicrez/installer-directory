import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { InputError, textField } from "@/lib/onboarding";
import { withinRateLimit } from "@/lib/directory-rfq";
import { publicZip } from "@/lib/location-quality";
export async function GET(request: NextRequest) {
  try {
    const name = textField(
      request.nextUrl.searchParams.get("name"),
      "business name",
      3,
      100,
    );
    const location = textField(
      request.nextUrl.searchParams.get("location"),
      "city or ZIP",
      2,
      100,
    );
    if (
      !(await withinRateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        "shop-lookup",
        60,
        3600,
      ))
    )
      throw new InputError("Please wait before searching again.", 429);
    const escape = (s: string) => s.replace(/[\\%_]/g, "\\$&");
    const values: string[] = [];
    const bind = (s: string) => {
      values.push(s);
      return "$" + values.length;
    };
    const terms = name
      .split(/\s+/)
      .slice(0, 6)
      .map((t) => `business_name ILIKE ${bind("%" + escape(t) + "%")}`);
    if (/^\d{5}$/.test(location))
      terms.push(`LEFT(zip_code,5)=${bind(location)}`);
    else {
      const [city, state] = location.split(",").map((x) => x.trim());
      terms.push(`city ILIKE ${bind(escape(city))}`);
      if (state) terms.push(`state ILIKE ${bind(escape(state))}`);
    }
    const { rows } = await getPool().query(
      `SELECT id,business_name,slug,street_address,city,state,zip_code FROM installers WHERE status NOT IN ('removed','non_us_excluded') AND ${terms.join(" AND ")} ORDER BY business_name,id LIMIT 11`,
      values,
    );
    return NextResponse.json(
      {
        shops: rows
          .slice(0, 10)
          .map((r) => ({ ...r, zip_code: publicZip(r.zip_code) })),
        limited: rows.length > 10,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Search is temporarily unavailable. Please retry.",
      },
      { status: e instanceof InputError ? e.status : 503 },
    );
  }
}
