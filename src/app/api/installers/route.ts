import { NextResponse } from 'next/server';
import { Pool } from 'pg';

let pool: Pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

const TABLE_NAMES = ['installers', 'installer', 'shops', 'shop'];

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getPool();

  // Try each possible table name
  for (const table of TABLE_NAMES) {
    try {
      const { rows } = await db.query(
        `SELECT * FROM ${table} WHERE status != 'removed' ORDER BY id`
      );
      return NextResponse.json(rows, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    } catch (error: any) {
      // Table doesn't exist, try next
      if (error.code === '42P01') continue;
      // Column issue — try without WHERE clause
      try {
        const { rows } = await db.query(`SELECT * FROM ${table} ORDER BY id`);
        return NextResponse.json(rows, {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        });
      } catch {
        continue;
      }
    }
  }

  // Last resort: list all tables for debugging
  try {
    const { rows } = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    return NextResponse.json(
      { error: 'No installer table found', tables: rows.map((r: any) => r.table_name) },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Database connection failed', detail: error.message },
      { status: 500 }
    );
  }
}
