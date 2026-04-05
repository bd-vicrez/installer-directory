import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      customer_name, 
      customer_phone, 
      customer_email, 
      vehicle_year, 
      vehicle_make, 
      vehicle_model, 
      what_needed, 
      additional_notes, 
      installer_id, 
      installer_business_name,
      installer_email 
    } = body;

    // Validate required fields
    if (!customer_name || !customer_phone || !customer_email || !vehicle_year || !vehicle_make || !vehicle_model || !what_needed) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_name, customer_phone, customer_email, vehicle_year, vehicle_make, vehicle_model, what_needed' },
        { status: 400 }
      );
    }

    if (!installer_email) {
      return NextResponse.json(
        { error: 'Installer email is required' },
        { status: 400 }
      );
    }

    // Send emails via SendGrid
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      console.error('SendGrid API key not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const submittedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York'
    });

    // Email 1: To the installer
    const installerSubject = `New Quote Request via Vicrez: ${vehicle_year} ${vehicle_make} ${vehicle_model}`;
    const installerHtmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">New Quote Request</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Via Vicrez Installer Network</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #dc2626; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Customer Information</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Name:</p>
                <p style="margin: 0; color: #6b7280;">${customer_name}</p>
              </div>
              <div>
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Phone:</p>
                <p style="margin: 0; color: #6b7280;">${customer_phone}</p>
              </div>
            </div>
            <div style="margin-top: 15px;">
              <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Email:</p>
              <p style="margin: 0; color: #6b7280;">${customer_email}</p>
            </div>
          </div>

          <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #dc2626; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Vehicle Details</h2>
            <div style="display: flex; gap: 20px; margin-bottom: 15px;">
              <div style="flex: 1;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Year:</p>
                <p style="margin: 0; color: #6b7280; font-size: 18px;">${vehicle_year}</p>
              </div>
              <div style="flex: 1;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Make:</p>
                <p style="margin: 0; color: #6b7280; font-size: 18px;">${vehicle_make}</p>
              </div>
              <div style="flex: 1;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Model:</p>
                <p style="margin: 0; color: #6b7280; font-size: 18px;">${vehicle_model}</p>
              </div>
            </div>
          </div>

          <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #dc2626; margin-top: 0; margin-bottom: 15px; font-size: 20px;">Installation Request</h2>
            <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">What they need installed:</p>
            <p style="margin: 0 0 15px 0; color: #6b7280; white-space: pre-wrap; line-height: 1.6;">${what_needed}</p>
            ${additional_notes ? `
              <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Additional notes:</p>
              <p style="margin: 0; color: #6b7280; white-space: pre-wrap; line-height: 1.6;">${additional_notes}</p>
            ` : ''}
          </div>

          <div style="background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #1e40af; font-weight: bold; font-size: 16px;">
              📧 This customer found you on the Vicrez Installer Network.<br>
              Please contact them within 24-48 hours for the best experience.
            </p>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Submitted on ${submittedDate}
            </p>
          </div>
        </div>
      </div>
    `;

    // Email 2: CC to Vicrez team
    const teamSubject = `Quote Request: ${customer_name} → ${installer_business_name}`;
    const teamHtmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; margin-bottom: 20px;">Quote Request Tracking</h2>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #374151;">Customer:</h3>
          <p><strong>Name:</strong> ${customer_name}</p>
          <p><strong>Phone:</strong> ${customer_phone}</p>
          <p><strong>Email:</strong> ${customer_email}</p>
          <p><strong>Vehicle:</strong> ${vehicle_year} ${vehicle_make} ${vehicle_model}</p>
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #374151;">Installer:</h3>
          <p><strong>Business:</strong> ${installer_business_name}</p>
          <p><strong>Email:</strong> ${installer_email}</p>
          <p><strong>ID:</strong> ${installer_id}</p>
        </div>

        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #dc2626;">Installation Request:</h3>
          <p style="white-space: pre-wrap;">${what_needed}</p>
          ${additional_notes ? `<p><strong>Notes:</strong> ${additional_notes}</p>` : ''}
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; font-size: 14px;">Submitted on ${submittedDate}</p>
        </div>
      </div>
    `;

    const sendgridPayload1 = {
      personalizations: [
        {
          to: [{ email: installer_email }]
        }
      ],
      from: {
        email: 'noreply@vicrez.com',
        name: 'Vicrez Installer Network'
      },
      subject: installerSubject,
      content: [
        {
          type: 'text/html',
          value: installerHtmlBody
        }
      ]
    };

    const sendgridPayload2 = {
      personalizations: [
        {
          to: [
            { email: 'luchovillacrez@gmail.com' },
            { email: 'luis.rbd@vicrez.com' }
          ]
        }
      ],
      from: {
        email: 'noreply@vicrez.com',
        name: 'Vicrez Installer Network'
      },
      subject: teamSubject,
      content: [
        {
          type: 'text/html',
          value: teamHtmlBody
        }
      ]
    };

    // Send both emails
    const [installerResponse, teamResponse] = await Promise.all([
      fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendgridPayload1)
      }),
      fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendgridPayload2)
      })
    ]);

    if (!installerResponse.ok) {
      const errorText = await installerResponse.text();
      console.error('SendGrid installer email error:', installerResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to send email to installer' },
        { status: 500 }
      );
    }

    if (!teamResponse.ok) {
      const errorText = await teamResponse.text();
      console.error('SendGrid team email error:', teamResponse.status, errorText);
      // Continue even if team email fails - installer email is more important
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Quote request sent successfully' 
    });

  } catch (error) {
    console.error('Quote request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}