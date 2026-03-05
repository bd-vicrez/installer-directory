import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop_name, email, reason, installer_id, business_name } = body;

    if (!shop_name || !email || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: shop_name, email, reason' },
        { status: 400 }
      );
    }

    const record = {
      id: Date.now(),
      shop_name,
      email,
      reason,
      installer_id: installer_id || null,
      business_name: business_name || null,
      submitted_at: new Date().toISOString(),
      status: 'pending',
    };

    // Store in a local JSON file (Vercel serverless: use /tmp)
    const filePath = path.join('/tmp', 'removal-requests.json');
    let existing: typeof record[] = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      existing = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }

    existing.push(record);
    await fs.writeFile(filePath, JSON.stringify(existing, null, 2));

    return NextResponse.json({ success: true, id: record.id });
  } catch (error) {
    console.error('Removal request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const filePath = path.join('/tmp', 'removal-requests.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const requests = JSON.parse(data);
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json([]);
  }
}
