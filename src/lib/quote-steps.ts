export function quoteStepError(
  fields: Record<string, any>,
  step: number,
  selected: boolean,
): string {
  if (step === 0) {
    const year = Number(fields.vehicle_year);
    if (
      !/^\d{4}$/.test(fields.vehicle_year) ||
      year < 1990 ||
      year > new Date().getFullYear() + 1
    )
      return (
        "Enter a vehicle year from 1990 through " +
        (new Date().getFullYear() + 1) +
        "."
      );
    if (
      (fields.vehicle_make || "").trim().length < 2 ||
      !(fields.vehicle_model || "").trim()
    )
      return "Enter your vehicle make and model.";
    if (!fields.service || !(fields.what_needed || "").trim())
      return "Choose a service and describe the parts or work needed.";
    if (!selected && !/^(?!00000)\d{5}$/.test(fields.zip_code))
      return "Enter your five-digit ZIP code.";
  }
  if (step === 1) {
    if ((fields.customer_name || "").trim().length < 2)
      return "Enter your name.";
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(fields.customer_email))
      return "Enter a valid email address.";
    if (
      !/^1?\d{10}$/.test(String(fields.customer_phone || "").replace(/\D/g, ""))
    )
      return "Enter a US phone number.";
  }
  if (step === 2 && fields.sharing_consent !== true)
    return "Confirm permission to share this request with the selected shop or shops.";
  return "";
}
