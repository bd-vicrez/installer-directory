import {
  InputError,
  textField,
  webLink,
  serviceFields,
  payloadHash,
} from "./onboarding";
import { STATE_NAMES } from "./locations";
export function requestRevision(row: Record<string, any>) {
  return payloadHash({
    status: row.status,
    reviewed_at: row.reviewed_at,
    public_message: row.public_message,
    details: row.details,
    street_address: row.street_address,
    city: row.city,
    state: row.state,
    zip_code: row.zip_code,
    phone: row.phone,
    website: row.website,
    install_capabilities: row.install_capabilities,
  });
}
export function applicantChanges(body: any, kind: string) {
  const note = textField(body.note, "additional information", 10, 2000);
  const evidence_url = webLink(body.evidence_url, "supporting business page");
  const changes: Record<string, any> = {};
  if (kind === "application" && body.changes) {
    if (typeof body.changes !== "object" || Array.isArray(body.changes))
      throw new InputError("Check updated business details.");
    for (const [key, value] of Object.entries(body.changes)) {
      if (
        ![
          "street_address",
          "city",
          "state",
          "zip_code",
          "phone",
          "website",
          "install_capabilities",
        ].includes(key)
      )
        throw new InputError("This field cannot be changed here.");
      if (key === "website") changes[key] = webLink(value);
      else if (key === "install_capabilities")
        changes[key] = serviceFields(value);
      else
        changes[key] = textField(
          value,
          key,
          2,
          key === "street_address" ? 200 : 100,
        );
    }
    if (changes.state) {
      changes.state = changes.state.toUpperCase();
      if (!STATE_NAMES[changes.state])
        throw new InputError("Choose a US state.");
    }
    if (
      changes.zip_code &&
      !/^(?!00000)\d{5}(?:-\d{4})?$/.test(changes.zip_code)
    )
      throw new InputError("Enter a valid ZIP.");
    if (changes.phone && !/^1?\d{10}$/.test(changes.phone.replace(/\D/g, "")))
      throw new InputError("Enter a US phone number.");
    if ("website" in changes && !changes.website)
      throw new InputError(
        "Supply the current business website or social profile.",
      );
  }
  return { note, evidence_url, changes };
}
