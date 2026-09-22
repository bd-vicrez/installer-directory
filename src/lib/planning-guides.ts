export interface PlanningGuide {
  title: string;
  description: string;
  sections: { title: string; paragraphs?: string[]; items?: string[] }[];
  worksheet: { field: string; detail: string }[];
}

export const PLANNING_GUIDES: Record<string, PlanningGuide> = {
  "customer-supplied-parts-installation": {
    title: "Bring Your Own Parts: Agree on the Installation Before Ordering",
    description:
      "A practical brief for confirming supplied-parts acceptance, the installation scope, delivery arrangements and responsibility for missing pieces.",
    sections: [
      {
        title: "Start with the actual vehicle and part",
        paragraphs: [
          "Send the vehicle year, make, model and trim, plus a link or part number for every item you want installed. Include photographs of the vehicle as it is now, showing previous modifications and any existing damage. A photograph of the look you want is helpful, but it is not a substitute for identifying the actual parts.",
          "Ask the shop to confirm the application and the work it is willing to perform. A directory service tag helps you find a candidate; it does not mean the shop accepts every aftermarket part or every vehicle. If fitment is unresolved, make that a question to settle before placing an order.",
        ],
      },
      {
        title: "Get a clear supplied-parts answer",
        items: [
          "Will the shop install these exact customer-supplied parts? Ask about each major item, not just whether it generally installs body kits or wheels.",
          "Who supplies required hardware, adhesives, consumables and other supporting components? Request a list of anything excluded from the parts purchase.",
          "What inspection will happen before installation? Agree on what happens if the delivered item is damaged, incomplete or does not match the agreed application.",
          "How does the shop handle a parts problem separately from a workmanship concern? Ask for its written terms for this specific job rather than assuming the parts seller and installer cover the same things.",
        ],
      },
      {
        title: "Arrange delivery with the receiving shop",
        paragraphs: [
          "Before shipping to a business, confirm the receiving address, contact person, delivery hours and whether the shop can accept the size and type of shipment. Ask whether it needs the vehicle present when the parts arrive. Agree on how the package will be identified and who will report a visible delivery problem.",
          "Do not assume a listing in this directory is permission to send a package. Wait for the receiving shop’s agreement and keep its instructions with your order record. The shop should also explain any storage arrangements if the parts arrive before the installation appointment.",
        ],
      },
      {
        title: "Approve a scope, not just a date",
        paragraphs: [
          "Ask for the estimate to distinguish inspection, preparation, test fitting, finish work and final assembly where relevant. If the shop discovers additional work, agree that it will describe the change and obtain your approval before proceeding. Use the quote-comparison worksheet to check whether two shops are quoting the same result.",
          "At collection, compare the finished work with the written scope. Keep the final invoice, part identification, photographs and any care instructions together so a later question can be traced to the actual installation.",
        ],
      },
    ],
    worksheet: [
      {
        field: "Vehicle and existing changes",
        detail: "Year / make / model / trim; modifications; photographs sent",
      },
      {
        field: "Parts to be supplied",
        detail:
          "Manufacturer / exact part numbers / quantities / supporting hardware",
      },
      {
        field: "Shop acceptance",
        detail:
          "Named contact; accepted items; items declined or still under review",
      },
      {
        field: "Receiving arrangement",
        detail:
          "Approved address; contact; delivery hours; package reference; storage terms",
      },
      {
        field: "Scope and changes",
        detail:
          "Included work; exclusions; inspection stage; approval method for extra work",
      },
      {
        field: "Collection documents",
        detail:
          "Invoice; installed parts; care instructions; applicable shop terms",
      },
    ],
  },
  "compare-installation-quotes": {
    title: "Compare Installation Quotes Using the Same Written Scope",
    description:
      "Compare preparation, fitting, finishing, materials, exclusions and handover details without mistaking a lower headline price for the same job.",
    sections: [
      {
        title: "Give every shop the same brief",
        paragraphs: [
          "A useful comparison starts before the price arrives. Send each shop the same vehicle details, current-condition photos, part numbers and requested result. Identify which parts you already own and which items the shop would supply. Tell each shop if the project includes separate repair work, a wrap, wheels or other modifications.",
          "Request a written estimate with line items and exclusions. If a shop needs to inspect the vehicle first, record that requirement and whether the initial number is only a provisional estimate. Do not compare a complete inspected scope with an early number based on a single photograph as though they were equivalent.",
        ],
      },
      {
        title: "Separate the stages of work",
        items: [
          "Inspection and preparation: what condition checks, damage repair or surface preparation are included?",
          "Fitting: is there a test-fit stage, and who will discuss any mismatch before permanent work or finishing?",
          "Finish: identify the surfaces to be painted or wrapped and the finish result being quoted.",
          "Materials and hardware: list the shop-supplied items, your supplied parts and any consumables charged separately.",
          "Related work: ask whether another shop handles part of the project and who coordinates it.",
          "Handover: include the final walkthrough, records and care instructions expected at collection.",
        ],
      },
      {
        title: "Compare uncertainty as well as price",
        paragraphs: [
          "For each estimate, write down what remains unknown. Examples include hidden damage, missing hardware, the condition beneath existing film or a part that has not yet been inspected. Ask how the shop will document additional work and obtain approval. A short, explicit list of uncertainties is more useful than treating every preliminary total as a guaranteed final price.",
          "Record appointment availability and dependencies separately from the estimated labor. A planned date can depend on parts arrival, inspection and finish work. Ask when the shop will confirm the schedule and how it will communicate a change. This guide intentionally supplies no local labor-rate averages: the comparison should use quotes for your actual job.",
        ],
      },
      {
        title: "Use completed work to clarify the result",
        paragraphs: [
          "Ask for an example comparable to your vehicle, part type and requested finish. Check whether an image shows the shop’s own completed work, a customer reference, a rendering or a work-in-progress stage. A broad service list or review score does not answer that question.",
          "Before accepting an estimate, confirm the customer-supplied-parts policy, the written shop terms and who you will contact during the project. Keep the agreed scope with the final invoice. If one quote excludes a stage that another includes, resolve the difference before choosing on price.",
        ],
      },
    ],
    worksheet: [
      {
        field: "Shop / contact / estimate date",
        detail: "Use the same project brief for Shop A and Shop B",
      },
      {
        field: "Vehicle / exact parts / condition",
        detail: "Mark whether an in-person inspection has happened",
      },
      {
        field: "Preparation / fitting / finish",
        detail: "Record each included stage and its quoted amount",
      },
      {
        field: "Materials / supplied parts",
        detail: "Identify who supplies each component and consumable",
      },
      {
        field: "Exclusions / unresolved items",
        detail: "List unknowns and how additional work is approved",
      },
      {
        field: "Schedule / handover / terms",
        detail:
          "Record dependencies, project updates, final documents and written shop terms",
      },
    ],
  },
  "document-your-installation-project": {
    title:
      "Document an Installation: Vehicle, Parts, Scope and Finished Result",
    description:
      "A project-record checklist for customers and shops, with clear distinctions between references, work in progress and a documented finished installation.",
    sections: [
      {
        title: "Build a record another customer can understand",
        paragraphs: [
          "A useful installation example answers more than whether the finished vehicle looks good. Identify the vehicle year, model and trim, the actual installed products and the work the shop completed. Explain any relevant starting condition or existing modification. Keep the description specific enough to distinguish the job from a generic service claim.",
          "Use exact part identifiers when available. If the brand or part number cannot be verified, describe the part without inventing an identification. Do not label a project a Vicrez installation solely because the shop appears in this directory.",
        ],
      },
      {
        title: "Capture the stages honestly",
        items: [
          "Before: show the vehicle and the area involved so the starting condition is clear.",
          "During: identify relevant preparation or test-fit stages. Label unfinished work as work in progress.",
          "After: show the completed installation from useful angles, including details that explain the result.",
          "Context: explain what the shop performed and what was supplied or completed by someone else.",
          "Labels: identify renderings, inspiration images and product photographs as such. They are not proof of a completed installation.",
        ],
      },
      {
        title: "Keep the customer record and public story separate",
        paragraphs: [
          "A customer may keep a detailed private record containing invoices and correspondence. A public project page should contain only the information needed to understand the installation. Leave out the customer’s personal contact information and unrelated documents. Check photos for personal items or identifying details that should not be shared.",
          "Before submitting media for publication, confirm you are entitled to use it and that the people involved have agreed to the proposed public use. Provide a caption describing the work rather than copying someone else’s review. If permission is unresolved, keep the image out of the public submission until it is settled.",
        ],
      },
      {
        title: "For shops contributing to this directory",
        paragraphs: [
          "Prepare the vehicle details, services performed, parts used, completion month and a short factual summary. Select photographs that document the same job and explain each stage. An owner can submit project details through the available shop-management process after access has been reviewed; publication still requires review.",
          "Separate the project story from current business policies. Confirm services, customer-supplied-parts acceptance and contact arrangements explicitly. A past project can demonstrate what happened on that vehicle; it does not promise the same scope, timing or price for every new request.",
        ],
      },
      {
        title: "For customers collecting a finished vehicle",
        paragraphs: [
          "Save the agreed scope, final invoice, installed-part identifiers and the shop’s care instructions. Photograph the finished result and make a note of any agreed follow-up. If there is a question later, this record helps you explain the actual installation without relying on memory or a generic product image.",
        ],
      },
    ],
    worksheet: [
      {
        field: "Vehicle",
        detail: "Year / make / model / trim; relevant existing modifications",
      },
      {
        field: "Installed parts",
        detail:
          "Product name / brand / verified part numbers; who supplied them",
      },
      {
        field: "Work performed",
        detail: "Preparation, fitting, finishing and any work done elsewhere",
      },
      {
        field: "Completion and evidence",
        detail:
          "Completion month; before / during / after captions; finished result",
      },
      {
        field: "Publication permission",
        detail:
          "Who owns the media; agreed public use; personal details removed",
      },
      {
        field: "Policies to confirm separately",
        detail:
          "Current services; supplied-parts acceptance; appointments and contact",
      },
    ],
  },
};
