import { Pool } from "pg";

// Keep the shared pool independent of directory content and SEO modules so
// small API routes do not load that data just to acquire a connection.
let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    const connection = new URL(process.env.DATABASE_URL || "");
    connection.searchParams.set("sslmode", "verify-full");
    pool = new Pool({
      connectionString: connection.toString(),
      ssl: { rejectUnauthorized: true },
      max: 5,
    });
  }
  return pool;
}
