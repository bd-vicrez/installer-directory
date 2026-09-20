import { InputError, textField } from "./onboarding";
import { canReceiveQuote } from "./installer-contact";

export const PILOT_FIELDS = [
  ["authority", "Owner/manager authority — source and date"],
  [
    "participation",
    "Owner's explicit agreement to participate — source and date",
  ],
  ["services", "Confirmed services, vehicles and equipment limits"],
  ["parts_policy", "Customer-supplied parts policy"],
  ["hours", "Business hours and shop's stated response expectation"],
  ["inquiry_consent", "Permission to receive inquiries — source and date"],
  ["contact_evidence", "How this private inbox was verified — source and date"],
  [
    "test_acknowledgment",
    "Shop's acknowledgment of an agreed labeled delivery test — source and date",
  ],
] as const;

export function pilotMissing(
  evidence: Record<string, any>,
  listing: Record<string, any>,
) {
  const missing: string[] = PILOT_FIELDS.filter(
    ([key]) =>
      typeof evidence[key] !== "string" || evidence[key].trim().length < 10,
  ).map(([, label]) => label);
  if (!canReceiveQuote(listing as any))
    missing.push("Active listing with a reviewed, enabled inquiry recipient");
  if (
    !evidence.contact_email ||
    evidence.contact_email.toLowerCase() !==
      (listing.routing_email || "").trim().toLowerCase()
  )
    missing.push("Verified email must match the current inquiry recipient");
  return missing;
}

export function pilotInput(body: Record<string, any>) {
  if (
    !["candidate", "reviewing", "active", "paused", "declined"].includes(
      body.decision,
    ) ||
    !Number.isInteger(body.version) ||
    body.version < 0
  )
    throw new InputError(
      "Choose a valid pilot decision and reload the saved record.",
    );
  const evidence: Record<string, string> = {};
  for (const [key, label] of PILOT_FIELDS)
    evidence[key] = textField(body.evidence?.[key], label, 0, 1000);
  evidence.contact_email = textField(
    body.evidence?.contact_email,
    "verified inquiry email",
    0,
    255,
  ).toLowerCase();
  if (
    evidence.contact_email &&
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(evidence.contact_email)
  )
    throw new InputError("Check the private inquiry email.");
  evidence.note = textField(body.evidence?.note, "review note", 10, 1500);
  return { decision: body.decision, version: body.version, evidence };
}
