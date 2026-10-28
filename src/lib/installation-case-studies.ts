export interface InstallationCaseStudy {
  title: string;
  description: string;
  videoId: string;
  videoPublished: string;
  updated: string;
  introduction: string;
  scope: string;
  observations: { heading: string; time: string; seconds: number; evidence: string; question: string }[];
  outcome: string;
  limits: string;
}

export const INSTALLATION_CASE_STUDIES: Record<string, InstallationCaseStudy> = {
  "challenger-vz101768-installation-case-study": {
    title: "Challenger VZ101768 widebody installation: a Vicrez project case study",
    description: "A documented Challenger installation: bumper hardware, flare positioning, finish scope and wheel planning, with timestamped evidence from Vicrez's installation video.",
    videoId: "Vv7V3JpN12Q",
    videoPublished: "February 23, 2021",
    updated: "2026-10-28",
    introduction: "Vicrez's installation team documents a Challenger widebody conversion using kit VZ101768. The recording follows bumper assembly and flare installation through the finished bodywork. It is a useful example of the decisions that belong in a shop's estimate before parts arrive.",
    scope: "The source identifies front bumper VZ101767 and fender flares VZ101488 as the components of kit VZ101768. The exact model year and trim of the demonstration car are not established here. Give your installer your own vehicle details and current product information; a model range in a video title is not a fitment approval for every trim.",
    observations: [
      {
        heading: "Separate paint work from the fitting demonstration",
        time: "1:06", seconds: 66,
        evidence: "The presenter explains that the parts were painted in advance for the demonstration. Later, the team leaves a lower piece unpainted to match the rocker area. The finished appearance therefore reflects choices made before and during assembly.",
        question: "Which pieces will be painted, which will remain textured or unpainted, and does the written estimate include preparation, color matching and test fitting before final finish?",
      },
      {
        heading: "Inventory transferred hardware and the selected configuration",
        time: "3:54", seconds: 234,
        evidence: "The team transfers bumper brackets from the original bumper. At 9:21, it distinguishes a bumper-only project from the widebody conversion when discussing side markers. The parts list depends on the configuration being installed.",
        question: "Which original brackets, markers and fasteners must be reusable, and which replacements are included in my exact order? Ask the shop to inspect these before committing to the assembly date.",
      },
      {
        heading: "Include preparation and bracket positioning in the scope",
        time: "7:39", seconds: 459,
        evidence: "The recording covers preparation of the flare bonding surfaces, followed by matching brackets to the correct pieces. At 12:36, the team positions the flares and brackets on the vehicle before final attachment. These are distinct tasks beyond simply unpacking the kit.",
        question: "How will the shop check panel alignment and mounting locations, and what attachment method will it use for this vehicle? Have the installer document any proposed drilling or permanent changes before work starts.",
      },
      {
        heading: "Treat wheels and release timing as separate decisions",
        time: "18:00", seconds: 1080,
        evidence: "The team describes a holding period after attaching the flares. Near 20:14 it says the car will retain its existing wheels temporarily, with a wheel upgrade planned for another video. The body installation and final wheel configuration are separate stages in this example.",
        question: "What curing or holding time does the chosen attachment system require, and how will the shop check tire clearance and the final wheel setup before the car is released?",
      },
    ],
    outcome: "The closing walkthrough presents the completed widebody bodywork with the existing wheels still fitted. The presenter reports roughly six to eight hours for this demonstration. That is a report about this recorded job, not an installed-price quote or a schedule for another vehicle; the parts were already painted and later wheel work was separate.",
    limits: "This case study is based on Vicrez's own video and caption track. It does not identify a participating directory shop, establish a labor invoice or document long-term performance. Current kit contents and fitment must be checked with Vicrez and the installer.",
  },
  "durango-rt-widebody-installation-case-study": {
    title: "2021 Durango R/T widebody installation: a Vicrez project case study",
    description: "A 2021 Durango R/T widebody project documented by Vicrez: kit selection, extensions, rockers, sensor wiring and door clearance, with source video timestamps.",
    videoId: "IJ5ajTpKSF4",
    videoPublished: "February 2, 2023",
    updated: "2026-10-28",
    introduction: "The video title refers to a Durango Hellcat installation, but the presenter identifies the actual demonstration vehicle as a 2021 Durango R/T. That distinction matters: the team explains which exterior pieces it changes to support the widebody configuration. This is an exterior installation example, not evidence of a drivetrain or performance conversion.",
    scope: "The recording opens with a comparison of the VZ102524, VZ102525, VZ102526 and VZ102527 configurations. It describes VZ102527 with flares, rocker panels and a front lip, and discusses additional extensions and front-end pieces for the demonstration vehicle. Use a written component list for your specific trim; the similar product numbers do not describe interchangeable scopes.",
    observations: [
      {
        heading: "Confirm the starting vehicle before choosing the kit",
        time: "0:35", seconds: 35,
        evidence: "The presenter compares the kit configurations and then identifies the vehicle as a 2021 R/T. At 2:38, the team explains the existing lip and the surrounding original parts that will be changed. A car that already has some conversion parts can require a different order from an otherwise similar stock vehicle.",
        question: "Has the installer checked my VIN, trim, bumper and existing modifications against a complete parts list? Which supporting pieces are included, and which must be ordered separately?",
      },
      {
        heading: "Account for extensions and rocker-panel work",
        time: "4:38", seconds: 278,
        evidence: "The team replaces fender extensions and reuses their clips. At 8:34, it installs the driver-side rocker panel and explains the clips and retained bolts. These supporting pieces are installed before the main flare work progresses.",
        question: "Does the estimate include removing and replacing the extensions and rockers, checking clips and fasteners, and matching the finish on any exposed areas?",
      },
      {
        heading: "Resolve sensors and wiring before final attachment",
        time: "10:48", seconds: 648,
        evidence: "The recording discusses the front sensor and reflector before flare attachment. At 15:30, the presenter explains that the sensor was left in its original socket on this build and discusses wiring reach for a different position. This is a vehicle-specific decision that should be resolved before the finished panels are secured.",
        question: "Where will each sensor and reflector sit, are suitable wiring extensions needed, and what functional checks or calibration does the vehicle manufacturer require after this work?",
      },
      {
        heading: "Check moving panels as the body pieces come together",
        time: "19:09", seconds: 1149,
        evidence: "The team fits a flare piece on the door separately from the surrounding pieces. At 21:12, it opens the door to check the installation, then finishes the remaining side pieces and repeats the work on the other side. The front lip is completed near the end of the recording.",
        question: "Will the shop check door operation, gaps, attachment security, sensor function and tire clearance as part of the final handover, and record any unresolved work?",
      },
    ],
    outcome: "The final sequence presents the widebody exterior with both sides assembled and the front lip installed. The source does not provide a documented labor invoice, total workshop time or independent sensor-test results. Those items should be agreed and recorded for your own project.",
    limits: "This case study draws on Vicrez's video, its description and caption track. Historical fitment statements in the 2023 recording should not be used as a current compatibility guarantee. The work is not attributed to any featured directory shop, and no owner participation or inquiry permission is implied.",
  },
};
