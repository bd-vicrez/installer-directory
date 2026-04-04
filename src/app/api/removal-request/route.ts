import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop_name, email, reason, installer_id, business_name } = body;

    // Validate required fields
    if (!shop_name || !email || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: shop_name, email, reason' },
        { status: 400 }
      );
    }

    // Send email via SendGrid
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      console.error('SendGrid API key not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const emailSubject = `Removal Request: ${business_name || shop_name}`;
    const submittedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York'
    });

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; margin-bottom: 20px;">Installer Removal Request</h2>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>Shop Name:</strong> ${shop_name}</p>
          <p><strong>Contact Email:</strong> ${email}</p>
          <p><strong>Business Name:</strong> ${business_name || 'Not provided'}</p>
          <p><strong>Installer ID:</strong> ${installer_id || 'Not provided'}</p>
          <p><strong>Submitted:</strong> ${submittedDate}</p>
        </div>

        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #dc2626;">Removal Reason:</h3>
          <p style="white-space: pre-wrap;">${reason}</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p><a href="https://installers.vicrez.com/admin/installers" style="background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Admin Panel →</a></p>
        </div>
      </div>
    `;

    const sendgridPayload = {
      personalizations: [
        {
          to: [
            { email: 'luchovillacrez@gmail.com' },
            { email: 'luis.rbd@vicrez.com' },
            { email: 'support@vicrez.com' }
          ]
        }
      ],
      from: {
        email: 'noreply@vicrez.com',
        name: 'Vicrez Installer Network'
      },
      subject: emailSubject,
      content: [
        {
          type: 'text/html',
          value: htmlBody
        }
      ]
    };

    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendgridPayload)
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      console.error('SendGrid error:', sendgridResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to send email notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Removal request submitted successfully' 
    });

  } catch (error) {
    console.error('Removal request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}