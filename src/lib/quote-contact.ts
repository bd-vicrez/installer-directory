export const QUOTE_SUPPORT_EMAIL = "b2bsupport@vicrezcom.zendesk.com";

// A single mailbox, never a display name, recipient list or header value.
export function validCustomerEmail(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 254) return false;
  const parts = value.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length <= 64 && local.split(".").every(p => /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+$/.test(p)) &&
    domain.split(".").length >= 2 && domain.split(".").every(p => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(p));
}

export function customerReplyHref(email: string, reference: string) {
  if (!validCustomerEmail(email)) return null;
  return "mailto:" + encodeURIComponent(email) + "?subject=" + encodeURIComponent("Re: Vicrez installation inquiry " + reference);
}

export function quoteSupportHref(reference = "") {
  return "mailto:" + QUOTE_SUPPORT_EMAIL + "?subject=" + encodeURIComponent("Help with installation inquiry" + (reference ? " " + reference : ""));
}
