import { InputError, textField } from "./onboarding";
export const PROJECT_FIELDS = [
  ["product_url", "Vicrez product link", 500],
  ["sku", "Part number / SKU", 80],
  ["parts_owned", "Parts you already own", 200],
  ["wheel_size", "Wheel size, width and offset", 80],
  ["tire_size", "Tire size", 80],
  ["fitment_notes", "Fitment / modification details", 300],
  ["installation_requirements", "Installation requirements", 600],
] as const;
export function projectBrief(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Check project details.");
  const result: Record<string, string> = {};
  for (const [key, label, max] of PROJECT_FIELDS)
    result[key] = textField(value[key], label, 0, max);
  if (result.product_url) {
    try {
      const u = new URL(result.product_url);
      if (
        u.protocol !== "https:" ||
        !["vicrez.com", "www.vicrez.com"].includes(u.hostname) ||
        u.username ||
        u.password ||
        u.port
      )
        throw Error();
      u.search = "";
      u.hash = "";
      result.product_url = u.toString();
    } catch {
      throw new InputError("Use an https://www.vicrez.com product link.");
    }
  }
  return result;
}
