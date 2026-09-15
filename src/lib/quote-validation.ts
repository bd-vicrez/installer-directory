export function validateQuoteInput(body: Record<string, any>) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Invalid request.';
  const limits: Record<string, [number, number]> = {
    customer_name: [2, 80], customer_email: [5, 255], customer_phone: [10, 30],
    vehicle_make: [2, 40], vehicle_model: [1, 60], what_needed: [1, 80],
  };
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (typeof body[key] !== 'string' || body[key].trim().length < min || body[key].trim().length > max) return 'Check your contact, vehicle and installation details.';
    body[key] = body[key].trim();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customer_email)) return 'Enter a valid email address.';
  const digits = body.customer_phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return 'Enter a valid phone number.';
  const year = Number(body.vehicle_year);
  if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) return 'Enter a valid vehicle year.';
  if (body.website_url) return 'Unable to accept this request.';
  if (body.additional_notes != null && (typeof body.additional_notes !== 'string' || body.additional_notes.length > 500)) return 'Keep additional notes under 500 characters.';
  if (body.installer_id != null && (typeof body.installer_id !== 'string' || body.installer_id.length > 80)) return 'Select a valid installer.';
  if (!body.installer_id && !/^\d{5}(?:-\d{4})?$/.test(body.zip_code || '')) return 'Enter a valid US ZIP code.';
  if (body.request_id != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.request_id)) return 'Invalid request reference.';
  for (const key of ['install_timeline', 'budget_range', 'how_heard']) {
    if (body[key] != null && (typeof body[key] !== 'string' || body[key].length > 120)) return 'Check your request details.';
  }
  for (const key of Object.keys(limits)) {
    if (/[\u0000-\u001f\u007f]/.test(body[key])) return 'Check your request details.';
  }
  if (body.hcaptcha_token != null && (typeof body.hcaptcha_token !== 'string' || body.hcaptcha_token.length > 4096)) return 'Invalid verification token.';
  return null;
}

export function quoteReceipt(data: Record<string, any>) {
  if (data?.ok !== true || !Number.isInteger(data.submission_id) || data.submission_id < 1) throw new Error('Request was not confirmed');
  return {
    success: true, status: 'received', reference: 'VZ-' + data.submission_id,
    message: 'Your quote request has been recorded. Please keep this reference. Shop availability and response times vary.',
  };
}
