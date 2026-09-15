export const validBusinessEmail = (value: unknown): value is string => typeof value === 'string' && value.length <= 255 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim());
export function canReceiveQuote(row: Record<string, any>): boolean {
  return row.status === 'active' && row.quote_routing_enabled === true && validBusinessEmail(row.routing_email) && !['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY'].includes(row.google_status);
}
export function publicContactEmail(row: Record<string, any>): string | null {
  return row.public_email_approved === true && row.public_email_approved_at && validBusinessEmail(row.public_email) ? row.public_email.trim() : null;
}
