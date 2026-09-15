import { isQuoteService } from "./quote-services";
import { UUID } from "./directory-rfq";
import { validBusinessEmail } from "./installer-contact";
export function validateQuoteInput(body: Record<string, any>) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return "Invalid request.";
  if (!isQuoteService(body.service))
    return "Choose the installation service you need.";
  if (body.sharing_consent !== true)
    return "Confirm that you want to share this request with the described recipient(s).";
  if (typeof body.request_id !== "string" || !UUID.test(body.request_id))
    return "Invalid request reference. Reopen the form.";
  if (
    body.session_id != null &&
    (typeof body.session_id !== "string" || !UUID.test(body.session_id))
  )
    return "Invalid session reference.";
  const limits: Record<string, [number, number]> = {
    customer_name: [2, 80],
    customer_email: [5, 255],
    customer_phone: [10, 30],
    vehicle_make: [2, 40],
    vehicle_model: [1, 60],
    what_needed: [1, 80],
  };
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (
      typeof body[key] !== "string" ||
      body[key].trim().length < min ||
      body[key].trim().length > max
    )
      return "Check your contact, vehicle and installation details.";
    body[key] = body[key].trim();
  }
  if (!validBusinessEmail(body.customer_email))
    return "Enter a valid email address.";
  const digits = body.customer_phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15)
    return "Enter a valid phone number.";
  const year = Number(body.vehicle_year);
  if (!["string", "number"].includes(typeof body.vehicle_year))
    return "Enter a valid vehicle year.";
  if (
    !Number.isInteger(year) ||
    year < 1990 ||
    year > new Date().getFullYear() + 1
  )
    return "Enter a valid vehicle year.";
  if (body.website_url) return "Unable to accept this request.";
  if (
    body.project_detail != null &&
    (typeof body.project_detail !== "string" ||
      body.project_detail.length > 250 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body.project_detail))
  )
    return "Keep project requirements under 250 characters.";
  if (
    body.additional_notes != null &&
    (typeof body.additional_notes !== "string" ||
      body.additional_notes.length > 500)
  )
    return "Keep additional notes under 500 characters.";
  if (
    body.installer_id != null &&
    (typeof body.installer_id !== "string" ||
      !body.installer_id.trim() ||
      body.installer_id.length > 80)
  )
    return "Select a valid installer.";
  if (
    body.zip_code &&
    (typeof body.zip_code !== "string" ||
      !/^\d{5}(?:-\d{4})?$/.test(body.zip_code))
  )
    return "Enter a valid US ZIP code.";
  if (!body.installer_id && !/^\d{5}(?:-\d{4})?$/.test(body.zip_code || ""))
    return "Enter a valid US ZIP code.";
  if (
    body.request_id != null &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      body.request_id,
    )
  )
    return "Invalid request reference.";
  for (const key of ["install_timeline", "budget_range", "how_heard"]) {
    if (
      body[key] != null &&
      (typeof body[key] !== "string" ||
        body[key].length > 120 ||
        /[\u0000-\u001f\u007f]/.test(body[key]))
    )
      return "Check your request details.";
  }
  for (const key of Object.keys(limits)) {
    if (/[\u0000-\u001f\u007f]/.test(body[key]))
      return "Check your request details.";
  }
  if (
    body.hcaptcha_token != null &&
    (typeof body.hcaptcha_token !== "string" ||
      body.hcaptcha_token.length > 4096)
  )
    return "Invalid verification token.";
  return null;
}

export function quoteReceipt(data: Record<string, any>) {
  if (
    data?.ok !== true ||
    !Number.isInteger(data.submission_id) ||
    data.submission_id < 1
  )
    throw new Error("Request was not confirmed");
  if (typeof data.receipt_token !== "string" || data.receipt_token.length > 512)
    throw new Error("Receipt status is unavailable");
  return {
    success: true,
    status: "received",
    reference: "VZ-" + data.submission_id,
    token: data.receipt_token,
    message:
      "Your request is saved. We are checking the selected recipient or matching service providers. Keep this reference; delivery and shop availability are not yet confirmed.",
  };
}
