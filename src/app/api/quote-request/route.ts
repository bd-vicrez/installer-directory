import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { quoteReceipt, validateQuoteInput } from '@/lib/quote-validation';
export const maxDuration = 60;
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// === Vicrez RFQ webhook (ai.vicrez.com) — fires Klaviyo + DB + B2B + top-3 installer routing ===
const RFQ_WEBHOOK_URL = process.env.RFQ_WEBHOOK_URL || 'https://ai.vicrez.com/webhook/rfq/submit';

async function forwardToRFQWebhook(payload: any, requestIp: string, userAgent: string, sourcePage: string) {
  // Confirm durable acceptance by the existing RFQ system before acknowledging the request.
  try {
    // Map the existing form payload to the RFQ webhook's expected shape.
    // The webhook requires: full_name, email, phone, vehicle_year, vehicle_make, vehicle_model,
    // kit_interest (array, min 1), install_timeline, zip_code.
    const kitInterest = (payload.what_needed || '').trim();
    const rfqPayload: any = {
      full_name: payload.customer_name,
      email: payload.customer_email,
      phone: payload.customer_phone.replace(/[^\d+]/g, ''),
      vehicle_year: parseInt(payload.vehicle_year, 10) || new Date().getFullYear(),
      vehicle_make: payload.vehicle_make,
      vehicle_model: payload.vehicle_model,
      kit_interest: kitInterest ? [kitInterest.slice(0, 80)] : ['Other'],
      install_timeline: payload.install_timeline || 'Not specified',
      zip_code: payload.zip_code || payload.customer_zip || '00000',
      preferred_installer_id: payload.installer_id || null,
      notes: payload.additional_notes || '',
      source_page: sourcePage,
      how_heard: payload.how_heard || 'installers.vicrez.com',
      website_url: payload.website_url || '',
      request_id: payload.request_id || null,
      hcaptcha_token: payload.hcaptcha_token || null,
      budget_range: payload.budget_range || null,
    };

    const res = await fetch(RFQ_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': requestIp, 'X-Source': 'installer-directory-quote-form', 'User-Agent': userAgent },
      body: JSON.stringify(rfqPayload), signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) throw new Error('RFQ acceptance failed');
    const receipt = await res.json();
    quoteReceipt(receipt);
    return receipt;
  } catch {
    throw new Error('We could not confirm your request. Please retry using the same form.');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 16384) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 16384) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    let body;
    try { body = JSON.parse(raw); }
    catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
    const invalid = validateQuoteInput(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    // Contact details come from the selected active shop, never from a caller-supplied recipient.
    delete body.installer_email;
    delete body.installer_business_name;
    if (body.installer_id) {
      const { rows } = await getPool().query("SELECT business_name,email,zip_code FROM installers WHERE id::text=$1 AND status='active' LIMIT 1", [body.installer_id]);
      if (!rows[0]) return NextResponse.json({ error: 'This installer is unavailable. Choose another shop.' }, { status: 404 });
      body.installer_email = rows[0].email;
      body.installer_business_name = rows[0].business_name;
      body.zip_code = /^\d{5}/.test(body.zip_code || '') ? body.zip_code : rows[0].zip_code;
    }
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
      installer_email,
      // Optional fields (city page submissions or richer forms)
      zip_code,
      install_timeline,
      budget_range,
      how_heard,
      hcaptcha_token,
    } = body;

    // Validate required fields
    if (!customer_name || !customer_phone || !customer_email || !vehicle_year || !vehicle_make || !vehicle_model || !what_needed) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_name, customer_phone, customer_email, vehicle_year, vehicle_make, vehicle_model, what_needed' },
        { status: 400 }
      );
    }

    // installer_email is only required when this is an installer-specific request.
    // City-page generic RFQs may not have it — in that case, the RFQ webhook routes to top-3 closest.
    const isCityPageRequest = !installer_id;

    if (!isCityPageRequest && !installer_email) {
      return NextResponse.json(
        { error: 'Installer email is required for installer-specific requests' },
        { status: 400 }
      );
    }

    // Capture request metadata for downstream auditing.
    const requestIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'unknown';

    const receipt = await forwardToRFQWebhook(body, requestIp, userAgent, referer);
    const accepted = quoteReceipt(receipt);
    if (isCityPageRequest || receipt.installers_notified > 0 || receipt.routed_to === 'b2b_support' || receipt.duplicate) {
      return NextResponse.json(accepted);
    }

    // === Installer-specific path: send SendGrid emails (existing behavior) ===
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      console.error('SendGrid API key not configured');
      // RFQ webhook already fired — return success so the lead isn't lost.
      return NextResponse.json(accepted);
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
                <p style="margin: 0; color: #6b7280;">${escapeHtml(customer_name)}</p>
              </div>
              <div>
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Phone:</p>
                <p style="margin: 0; color: #6b7280;">${escapeHtml(customer_phone)}</p>
              </div>
            </div>
            <div style="margin-top: 15px;">
              <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Email:</p>
              <p style="margin: 0; color: #6b7280;">${escapeHtml(customer_email)}</p>
            </div>
          </div>

          <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #dc2626; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Vehicle Details</h2>
            <div style="display: flex; gap: 20px; margin-bottom: 15px;">
              <div style="flex: 1;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Year:</p>
                <p style="margin: 0; color: #6b7280; font-size: 18px;">${escapeHtml(vehicle_year)}</p>
              </div>
              <div style="flex: 1;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Make:</p>
                <p style="margin: 0; color: #6b7280; font-size: 18px;">${escapeHtml(vehicle_make)}</p>
              </div>
              <div style="flex: 1;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Model:</p>
                <p style="margin: 0; color: #6b7280; font-size: 18px;">${escapeHtml(vehicle_model)}</p>
              </div>
            </div>
          </div>

          <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #dc2626; margin-top: 0; margin-bottom: 15px; font-size: 20px;">Installation Request</h2>
            <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">What they need installed:</p>
            <p style="margin: 0 0 15px 0; color: #6b7280; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(what_needed)}</p>
            ${additional_notes ? `
              <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Additional notes:</p>
              <p style="margin: 0; color: #6b7280; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(additional_notes)}</p>
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
          <p><strong>Name:</strong> ${escapeHtml(customer_name)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(customer_phone)}</p>
          <p><strong>Email:</strong> ${escapeHtml(customer_email)}</p>
          <p><strong>Vehicle:</strong> ${escapeHtml(vehicle_year)} ${escapeHtml(vehicle_make)} ${escapeHtml(vehicle_model)}</p>
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #374151;">Installer:</h3>
          <p><strong>Business:</strong> ${escapeHtml(installer_business_name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(installer_email)}</p>
          <p><strong>ID:</strong> ${escapeHtml(installer_id)}</p>
        </div>

        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #dc2626;">Installation Request:</h3>
          <p style="white-space: pre-wrap;">${escapeHtml(what_needed)}</p>
          ${additional_notes ? `<p><strong>Notes:</strong> ${escapeHtml(additional_notes)}</p>` : ''}
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
        signal: AbortSignal.timeout(10000), body: JSON.stringify(sendgridPayload1)
      }),
      fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000), body: JSON.stringify(sendgridPayload2)
      })
    ]).catch(() => [null, null]);

    if (!installerResponse?.ok) {
      console.error('SendGrid installer email failed:', installerResponse?.status || 'timeout');
      // RFQ webhook already fired — still return success so the customer doesn't see an error.
      return NextResponse.json(accepted);
    }

    if (!teamResponse?.ok) {
      console.error('SendGrid team email failed:', teamResponse?.status || 'timeout');
      // Continue even if team email fails - installer email is more important
    }

    return NextResponse.json(accepted);

  } catch (error) {
    console.error('Quote request could not be confirmed');
    return NextResponse.json(
      { error: 'We could not confirm your request. Please retry using the same form.' },
      { status: 503 }
    );
  }
}
