import { QUOTE_SERVICES, recordedQuoteServices } from "./quote-services";
export const SERVICE_ALIASES: Record<string, string> = {
  "Body Kits": "body-kits",
  "Paint/Bodywork": "paint-bodywork",
  "Vinyl/Wraps": "vinyl-wrap",
  PPF: "ppf",
  "Performance Mods": "performance",
  "Wheels/Tires": "wheels-tires",
  "wheels-and-tires": "wheels-tires",
  "ppf-installers": "ppf",
};
const extra = [
  {
    id: "widebody-kits",
    label: "Widebody kits",
    aliases: [
      "widebody",
      "wide body",
      "fender flare",
      "fender flares",
      "overfender",
    ],
  },
  {
    id: "aero-parts",
    label: "Aero parts",
    aliases: ["aero", "spoiler", "splitter", "diffuser", "side skirt", "wing"],
  },
  {
    id: "custom-builds",
    label: "Custom builds",
    aliases: [
      "custom build",
      "custom builds",
      "fabrication",
      "restomod",
      "show car",
    ],
  },
];
export const DIRECTORY_SERVICES = [...QUOTE_SERVICES, ...extra];
export const normalizeService = (value: string) =>
  SERVICE_ALIASES[value] || value;
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function directoryServices(value: unknown) {
  const text =
    " " +
    normalize(Array.isArray(value) ? value.join(" ") : String(value || "")) +
    " ";
  return [
    ...recordedQuoteServices(value),
    ...extra
      .filter((s) => s.aliases.some((a) => text.includes(" " + a + " ")))
      .map((s) => s.id),
  ];
}
export function serviceLabels(value: unknown) {
  return directoryServices(value).map(
    (id) => DIRECTORY_SERVICES.find((s) => s.id === id)!.label,
  );
}
// SQL and JS share aliases and word boundaries. The only column accepted is an internal literal.
export function serviceSql(
  id: string,
  bind: (value: any) => string,
  column = "install_capabilities",
) {
  if (!["install_capabilities", "i.install_capabilities"].includes(column))
    throw new Error("Invalid service column");
  const service = DIRECTORY_SERVICES.find((s) => s.id === normalizeService(id));
  if (!service) throw new Error("Invalid service");
  let expression = `(' ' || BTRIM(regexp_replace(LOWER(COALESCE(${column}::text,'')),'[^a-z0-9]+',' ','g')) || ' ')`;
  if (service.id === "paint-bodywork")
    expression = `regexp_replace(${expression},'\\mpaint protection( film)?\\M',' ','g')`;
  if (service.id === "wheels-tires")
    expression = `regexp_replace(${expression},'\\msteering wheels?\\M',' ','g')`;
  return service.aliases.length
    ? "(" +
        service.aliases
          .map(
            (a) => `strpos(${expression},${bind(" " + normalize(a) + " ")})>0`,
          )
          .join(" OR ") +
        ")"
    : "FALSE";
}
