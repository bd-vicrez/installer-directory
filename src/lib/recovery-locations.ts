export const RECOVERY_LOCATIONS: Record<
  string,
  { shop: string; title: string; introduction: string; questions: string[] }
> = {
  "las-vegas-nv/body-kits": {
    shop: "b-wraps-las-vegas-nv",
    title: "Planning a Charger or Challenger body-kit project in Las Vegas",
    introduction:
      "B wraps’ business submission specifically mentions Chargers and Challengers. That is useful context when building a shortlist, but it does not confirm experience with your exact model year or kit. Compare the proposed fitting and finishing scope before choosing a shop.",
    questions: [
      "Send the model year, trim and exact kit part numbers together; ask the shop to identify anything it cannot quote from those details.",
      "Ask for a comparable finished job on the same vehicle generation, including close views of fit and finish.",
      "Separate existing-damage repair, kit preparation, paint and final installation in the estimate.",
    ],
  },
  "sacramento-ca/widebody-kits": {
    shop: "central-auto-customs-inc-sacramento-ca",
    title: "Planning a Mopar widebody project in Sacramento",
    introduction:
      "Central Auto Customs’ submitted specialty description mentions Mopar widebody conversions. Use that specific lead to ask about your proposed conversion. The record is not proof that a particular wheel setup, body style or kit has been installed there.",
    questions: [
      "Have the shop identify the panels involved and explain any proposed permanent modifications before you authorize work.",
      "Request separate line items for panel work, kit preparation and finishing, plus any wheel or suspension work handled elsewhere.",
      "Agree on a test-fit review before the final finish and ask for documentation of a comparable conversion.",
    ],
  },
  "san-antonio-tx/vinyl-wrap": {
    shop: "wrap-elements-llc-san-antonio-tx",
    title: "Coordinating a wrap with other upgrades in San Antonio",
    introduction:
      "Wrap Elements’ business submission lists vinyl wrap along with body kits, wheels/tires, suspension and other services. A multi-service record can help start a planning conversation. Confirm which work is currently performed at the location and whether one estimate covers the whole project.",
    questions: [
      "List body or paint work separately from the wrap and ask the shop to propose the sequence.",
      "Define coverage by panel, including the treatment of existing accessories and any new aero parts.",
      "Ask which materials, removal work and subcontracted services are included, and who coordinates collection.",
    ],
  },
  "fitchburg-ma/body-kits": {
    shop: "kustom-kreations-inc-fitchburg-ma",
    title: "Existing-kit installation or custom fabrication in Fitchburg?",
    introduction:
      "Kustom Kreations’ website describes both kit installation and design/prototyping. Those are different project scopes. Decide whether you want a purchased part installed or a custom design developed, then ask for a quote that makes the stages and deliverables clear.",
    questions: [
      "For a purchased kit, provide the exact part numbers and ask which fit or finish work is needed.",
      "For custom fabrication, agree on the design review, mock-up and final-part deliverables before discussing a completion date.",
      "Ask the shop to show comparable completed work and clarify whether photographs show a rendering, a prototype or the finished vehicle.",
    ],
  },
  "chicago-il/vinyl-wrap": {
    shop: "speedpro-chicago-loop-chicago-il-66fd2024",
    title: "Preparing a fleet-graphics brief in Chicago",
    introduction:
      "SpeedPro Chicago Loop’s approved directory application describes vehicle wraps and fleet graphics within its printing services. A commercial graphics job needs a different brief from a simple color-change request. Confirm the branch accepts your exact vehicle and coverage before arranging delivery.",
    questions: [
      "Provide the vehicle count and body styles, coverage areas, brand artwork and any existing graphics that need removal.",
      "Ask how proofs and revisions are handled and identify who approves the artwork before production.",
      "For a fleet, agree on vehicle downtime and whether future replacement graphics can be reproduced from the approved files.",
    ],
  },
};
