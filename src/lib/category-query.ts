import { getPool } from "./db";
import { serviceSql } from "./service-taxonomy";
export const CATEGORY_PAGE_SIZE = 24;
export function pageNumber(raw: unknown) {
  return typeof raw === "string" && /^[1-9]\d{0,4}$/.test(raw)
    ? Number(raw)
    : 1;
}
export async function categoryPage(category: string, page: number) {
  const values: any[] = [];
  const bind = (value: any) => {
    values.push(value);
    return "$" + values.length;
  };
  const where =
    "status NOT IN ('removed','non_us_excluded') AND " +
    serviceSql(category, bind);
  const db = getPool();
  const total = Number(
    (
      await db.query(
        "SELECT COUNT(*)::int AS total FROM installers WHERE " + where,
        values,
      )
    ).rows[0].total,
  );
  const rows = (
    await db.query(
      "SELECT * FROM installers WHERE " +
        where +
        ` ORDER BY google_review_count DESC NULLS LAST,id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, CATEGORY_PAGE_SIZE, (page - 1) * CATEGORY_PAGE_SIZE],
    )
  ).rows;
  return {
    total,
    rows,
    pages: Math.max(1, Math.ceil(total / CATEGORY_PAGE_SIZE)),
  };
}
