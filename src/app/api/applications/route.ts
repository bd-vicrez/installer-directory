import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const required = ['business_name', 'city', 'state', 'zip', 'phone', 'email', 'services', 'agreement'];
    const missing = required.filter(field => !body[field] || 
      (field === 'services' && (!body.services || body.services.length === 0)));
    
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    // Check social media presence
    if (!body.website && !body.instagram && !body.facebook) {
      return NextResponse.json({ 
        error: 'At least one form of web presence (website, Instagram, or Facebook) is required' 
      }, { status: 400 });
    }

    // Honeypot check
    if (body.honeypot) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
    }

    const db = getPool();

    // Map form fields to DB column names
    const streetAddress = body.street || null;
    const zipCode = body.zip;
    const installCapabilities = body.services; // Array to be stored as TEXT[]

    // Dupe detection: check both applications and installers tables
    const dupeCheckQuery = `
      SELECT 'installer' as source, id, business_name FROM installers 
      WHERE phone = $1 OR (city = $2 AND state = $3 AND street_address = $4)
      UNION
      SELECT 'application' as source, id, business_name FROM applications
      WHERE phone = $1 OR (city = $2 AND state = $3 AND street_address = $4)
      LIMIT 1
    `;
    
    const { rows: dupes } = await db.query(dupeCheckQuery, [
      body.phone,
      body.city,
      body.state,
      streetAddress || ''
    ]);

    if (dupes.length > 0) {
      return NextResponse.json({ 
        error: 'A listing with this information already exists' 
      }, { status: 409 });
    }

    // Generate unique ID
    const id = randomUUID();

    // Generate application_id: get the last one and increment
    const { rows: lastApp } = await db.query(
      'SELECT application_id FROM applications ORDER BY submitted_at DESC LIMIT 1'
    );
    
    let applicationId = 'APP-000001';
    if (lastApp.length > 0 && lastApp[0].application_id) {
      const lastNumber = parseInt(lastApp[0].application_id.replace('APP-', ''));
      const nextNumber = lastNumber + 1;
      applicationId = `APP-${nextNumber.toString().padStart(6, '0')}`;
    }

    // Auto-enrich with Google Places API (just log it since applications table doesn't have google columns)
    try {
      const searchQuery = `${body.business_name} ${body.city} ${body.state}`;
      const googleResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id,rating,user_ratings_total&key=${process.env.GOOGLE_PLACES_API_KEY}`
      );
      
      if (googleResponse.ok) {
        const googleResult = await googleResponse.json();
        if (googleResult.candidates && googleResult.candidates.length > 0) {
          const place = googleResult.candidates[0];
          console.log('Google Places enrichment:', {
            business_name: body.business_name,
            google_place_id: place.place_id,
            google_rating: place.rating,
            google_review_count: place.user_ratings_total
          });
        }
      }
    } catch (error) {
      console.log('Google Places enrichment failed:', error);
    }

    // Insert into applications table
    const insertQuery = `
      INSERT INTO applications (
        id, application_id, business_name, street_address, city, state, zip_code, 
        phone, email, website, install_capabilities, status, submitted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', NOW()
      ) RETURNING id, application_id
    `;

    const { rows } = await db.query(insertQuery, [
      id,
      applicationId,
      body.business_name,
      streetAddress,
      body.city,
      body.state,
      zipCode,
      body.phone,
      body.email,
      body.website || (body.instagram ? `https://instagram.com/${body.instagram.replace('@', '')}` : body.facebook),
      installCapabilities
    ]);

    // Send notification email via SendGrid
    try {
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: #e31937; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">New Installer Application</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0 0 15px 0;">${body.business_name}</h2>
              <p style="margin: 5px 0; color: #666;"><strong>Application ID:</strong> ${applicationId}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${body.city}, ${body.state} ${zipCode}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${body.phone}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${body.email}</p>
              ${body.website ? `<p style="margin: 5px 0; color: #666;"><strong>Website:</strong> <a href="${body.website}" style="color: #e31937;">${body.website}</a></p>` : ''}
              <p style="margin: 15px 0 5px 0; color: #666;"><strong>Services:</strong></p>
              <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                ${installCapabilities.map((service: string) => 
                  `<span style="background: #e31937; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${service}</span>`
                ).join('')}
              </div>
            </div>
            <div style="text-align: center;">
              <a href="https://installers.vicrez.com/admin/applications" 
                 style="background: #e31937; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Review Application
              </a>
            </div>
          </div>
        </div>
      `;

      const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [
              { email: 'luchovillacrez@gmail.com' },
              { email: 'luis.rbd@vicrez.com' },
              { email: 'support@vicrez.com' }
            ],
            subject: `New Installer Application: ${body.business_name} (${applicationId})`
          }],
          from: {
            email: 'noreply@vicrez.com',
            name: 'Vicrez Installer Network'
          },
          content: [{
            type: 'text/html',
            value: emailBody
          }]
        })
      });

      if (!emailResponse.ok) {
        console.error('Failed to send notification email:', await emailResponse.text());
      }
    } catch (error) {
      console.error('Email sending failed:', error);
    }

    return NextResponse.json({ 
      success: true, 
      id: rows[0].id,
      application_id: rows[0].application_id,
      message: 'Application submitted successfully' 
    });

  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Admin only
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const db = getPool();
    let query = 'SELECT * FROM applications';
    let params: any[] = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY submitted_at DESC';
    
    const { rows } = await db.query(query, params);
    
    return NextResponse.json({ applications: rows });

  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}