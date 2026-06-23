// State-specific data for tire shop startup guides.
// Sources: state SOS websites, EPA waste tire program directories,
// state revenue/sales tax departments (verified June 2026).
// Numbers are rounded for usability; always verify current rates with state authorities before filing.

export interface StateData {
  slug: string;
  abbr: string;
  name: string;
  capital: string;
  registeredVehicles: string; // millions, formatted
  topMetros: string[];
  costTier: 'low' | 'mid' | 'high';
  costMultiplier: number; // applied to national-average startup cost
  // Licensing
  llcFilingFee: string;
  llcFilingTimeDays: string;
  salesTaxRate: string; // state base rate (local adds on top)
  needsStateBusinessLicense: boolean;
  // Industry-specific
  needsAutomotiveRepairLicense: boolean;
  automotiveRepairAgency?: string;
  epaWasteTireProgram: boolean;
  epaProgramName?: string;
  epaTireDisposalFee?: string;
  // Market notes
  startupCostRange: { mobile: string; singleBay: string; multiBay: string };
  marketNotes: string;
  whyHere: string[]; // 3 reasons this state is a good (or interesting) tire shop market
  watchouts: string[]; // 2-3 state-specific watchouts
  // Resources
  sosUrl: string;
  taxUrl: string;
  epaUrl?: string;
  repairLicenseUrl?: string;
}

export const STATE_DATA: Record<string, StateData> = {
  texas: {
    slug: 'texas',
    abbr: 'TX',
    name: 'Texas',
    capital: 'Austin',
    registeredVehicles: '23.8M',
    topMetros: ['Houston', 'Dallas–Fort Worth', 'San Antonio', 'Austin', 'El Paso'],
    costTier: 'mid',
    costMultiplier: 1.0,
    llcFilingFee: '$300',
    llcFilingTimeDays: '2–5 business days online',
    salesTaxRate: '6.25% state + up to 2% local (max 8.25%)',
    needsStateBusinessLicense: false,
    needsAutomotiveRepairLicense: false,
    epaWasteTireProgram: true,
    epaProgramName: 'TCEQ Used or Scrap Tire Program',
    epaTireDisposalFee: '$2 per tire (collected from customer at sale)',
    startupCostRange: {
      mobile: '$35K–$80K',
      singleBay: '$92K–$210K',
      multiBay: '$195K–$405K',
    },
    marketNotes:
      'Texas is one of the most favorable tire shop markets in the U.S. — no state income tax, no state business license requirement, and a vehicle population per capita that is 35% higher than the national average. Houston and Dallas–Fort Worth alone account for more than 11M registered vehicles. Commercial fleet density (oil and gas, construction, last-mile delivery) is among the highest in the country.',
    whyHere: [
      'No state income tax keeps owner take-home 5–9 percentage points higher than coastal states.',
      'Per-capita vehicle ownership 35% above national average — strong tire replacement demand.',
      'Massive commercial fleet base (energy, construction, logistics) supports recurring revenue.',
    ],
    watchouts: [
      'Summer heat (Houston, San Antonio) accelerates tire wear and creates seasonal demand spikes — staff for it or you will lose customers to wait times.',
      'TCEQ waste tire compliance is enforced — you must use a registered transporter and keep manifests for 3 years.',
      'Commercial property is appreciating fast in Austin and DFW. Lock in long leases or buy if you can.',
    ],
    sosUrl: 'https://www.sos.state.tx.us/corp/sosda/index.shtml',
    taxUrl: 'https://comptroller.texas.gov/taxes/sales/',
    epaUrl: 'https://www.tceq.texas.gov/permitting/waste_permits/ihw_permits/usedscraptires',
  },
  california: {
    slug: 'california',
    abbr: 'CA',
    name: 'California',
    capital: 'Sacramento',
    registeredVehicles: '31.4M',
    topMetros: ['Los Angeles', 'San Francisco Bay Area', 'San Diego', 'Sacramento', 'Riverside–San Bernardino'],
    costTier: 'high',
    costMultiplier: 1.25,
    llcFilingFee: '$70 + $800 annual franchise tax',
    llcFilingTimeDays: '5–10 business days standard',
    salesTaxRate: '7.25% state + 1.0–2.5% local (range 7.25–10.75%)',
    needsStateBusinessLicense: true,
    needsAutomotiveRepairLicense: true,
    automotiveRepairAgency: 'Bureau of Automotive Repair (BAR)',
    epaWasteTireProgram: true,
    epaProgramName: 'CalRecycle Waste Tire Program',
    epaTireDisposalFee: '$1.75 per tire (state) + retailer-set transport fee',
    startupCostRange: {
      mobile: '$45K–$105K',
      singleBay: '$118K–$275K',
      multiBay: '$250K–$525K',
    },
    marketNotes:
      'California is a high-cost but high-revenue market. Average ticket runs 25–35% above national average due to higher labor costs and premium tire preference, but rent, payroll, insurance, and compliance costs are all in the top quartile nationally. BAR registration is non-negotiable and adds consumer-protection rules that take real attention.',
    whyHere: [
      '31M+ registered vehicles — largest single-state market in the U.S.',
      'Premium-tire preference is highest in the country, meaning higher dollar margins per service.',
      'Strong EV adoption is creating demand for EV-specific tire expertise (heavier vehicles, faster wear).',
    ],
    watchouts: [
      'BAR (Bureau of Automotive Repair) registration is required. Comes with consumer-protection disclosure rules; non-compliance fines start at $1,000 per violation.',
      '$800/year LLC franchise tax is owed regardless of revenue — budget for it from day one.',
      'CalRecycle compliance and waste tire manifesting are audited more aggressively than most states.',
    ],
    sosUrl: 'https://www.sos.ca.gov/business-programs/business-entities',
    taxUrl: 'https://www.cdtfa.ca.gov/taxes-and-fees/sales-use-tax.htm',
    epaUrl: 'https://calrecycle.ca.gov/Tires/',
    repairLicenseUrl: 'https://www.bar.ca.gov/Industry/Auto_Repair_Dealer.html',
  },
  florida: {
    slug: 'florida',
    abbr: 'FL',
    name: 'Florida',
    capital: 'Tallahassee',
    registeredVehicles: '17.9M',
    topMetros: ['Miami–Fort Lauderdale', 'Tampa Bay', 'Orlando', 'Jacksonville', 'Cape Coral–Fort Myers'],
    costTier: 'mid',
    costMultiplier: 1.0,
    llcFilingFee: '$125',
    llcFilingTimeDays: '2–7 business days online',
    salesTaxRate: '6.0% state + 0.5–1.5% local (range 6.0–7.5%)',
    needsStateBusinessLicense: false,
    needsAutomotiveRepairLicense: true,
    automotiveRepairAgency: 'Florida Department of Agriculture and Consumer Services (Motor Vehicle Repair Registration)',
    epaWasteTireProgram: true,
    epaProgramName: 'FDEP Waste Tire Program',
    epaTireDisposalFee: '$1 per new tire sold (state) + retailer transport pass-through',
    startupCostRange: {
      mobile: '$36K–$82K',
      singleBay: '$96K–$215K',
      multiBay: '$205K–$410K',
    },
    marketNotes:
      'Florida combines strong fundamentals — no state income tax, fast-growing population, year-round driving — with relatively low entry costs. The Motor Vehicle Repair Registration through FDACS is straightforward but mandatory; do not skip it. Insurance costs run 15–25% above national average due to weather, fraud, and auto-litigation environment.',
    whyHere: [
      'No state income tax preserves owner profit.',
      'Population growth is among the fastest in the U.S. — vehicle base is expanding.',
      'Year-round driving climate means no seasonal demand collapse.',
    ],
    watchouts: [
      'Motor Vehicle Repair Registration (FDACS) is required before you take a single paying customer. $50–$300 fee depending on number of employees.',
      'Hurricane prep is real. Brick-and-mortar shops should budget for $5K–$15K in shutters / generator / storm prep, and an additional 1–2 weeks of working capital reserve.',
      'General liability insurance premiums in Florida run 20–40% above the national average.',
    ],
    sosUrl: 'https://dos.fl.gov/sunbiz/start-business/',
    taxUrl: 'https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx',
    epaUrl: 'https://floridadep.gov/waste/waste-reduction/content/waste-tires',
    repairLicenseUrl: 'https://www.fdacs.gov/Business-Services/Motor-Vehicle-Repair',
  },
  'new-york': {
    slug: 'new-york',
    abbr: 'NY',
    name: 'New York',
    capital: 'Albany',
    registeredVehicles: '11.4M',
    topMetros: ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany'],
    costTier: 'high',
    costMultiplier: 1.25,
    llcFilingFee: '$200 + $9 biennial fee + publication requirement (varies $200–$2,000+)',
    llcFilingTimeDays: '5–15 business days; faster with expedite fee',
    salesTaxRate: '4.0% state + 3.0–4.875% local (range 7.0–8.875%)',
    needsStateBusinessLicense: false,
    needsAutomotiveRepairLicense: true,
    automotiveRepairAgency: 'NYS DMV Motor Vehicle Repair Shop Registration',
    epaWasteTireProgram: true,
    epaProgramName: 'NYSDEC Waste Tire Management Program',
    epaTireDisposalFee: '$2.50 per new tire sold (state surcharge)',
    startupCostRange: {
      mobile: '$48K–$108K',
      singleBay: '$120K–$280K',
      multiBay: '$255K–$535K',
    },
    marketNotes:
      'New York has unique challenges — LLC publication requirement adds $200–$2,000+ to startup, NYC commercial rent is among the highest in the country, and NYSDMV repair shop registration adds consumer-protection rules. But Buffalo, Rochester, and Syracuse all have meaningful upstate markets with much lower entry costs than NYC. Mobile tire businesses in NYC outer boroughs (Queens, Brooklyn, Bronx) are particularly underserved.',
    whyHere: [
      '11M+ registered vehicles concentrated in dense, drivable suburban/exurban rings.',
      'Mobile tire is wide open in NYC outer boroughs and Long Island — parking and convenience make shop visits painful.',
      'Upstate metros (Buffalo, Rochester) have entry costs 25–40% below downstate with stable demand.',
    ],
    watchouts: [
      'LLC publication requirement is real and varies wildly by county. Cheapest counties (Albany, Onondaga) cost $200–$400; NYC counties (NY, Kings, Queens) cost $1,200–$2,500+.',
      'NYSDMV Motor Vehicle Repair Shop registration is required and renews annually. Budget time for the inspection process.',
      'NYC parking and commercial loading restrictions can make mobile operations operationally complex. Scout your service area.',
    ],
    sosUrl: 'https://dos.ny.gov/forming-limited-liability-company',
    taxUrl: 'https://www.tax.ny.gov/bus/st/stidx.htm',
    epaUrl: 'https://www.dec.ny.gov/chemical/8512.html',
    repairLicenseUrl: 'https://dmv.ny.gov/registration/registering-repair-shop',
  },
  ohio: {
    slug: 'ohio',
    abbr: 'OH',
    name: 'Ohio',
    capital: 'Columbus',
    registeredVehicles: '11.9M',
    topMetros: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron'],
    costTier: 'mid',
    costMultiplier: 1.0,
    llcFilingFee: '$99',
    llcFilingTimeDays: '3–7 business days online',
    salesTaxRate: '5.75% state + 0.75–2.25% local (range 6.5–8.0%)',
    needsStateBusinessLicense: false,
    needsAutomotiveRepairLicense: false,
    epaWasteTireProgram: true,
    epaProgramName: 'Ohio EPA Scrap Tire Management Program',
    epaTireDisposalFee: '$1 per new tire (state recycling fee)',
    startupCostRange: {
      mobile: '$34K–$78K',
      singleBay: '$90K–$205K',
      multiBay: '$190K–$395K',
    },
    marketNotes:
      'Ohio offers one of the best risk-adjusted markets in the country — low LLC and licensing costs, no state-level automotive repair license, moderate sales tax, and a strong manufacturing and logistics fleet base. Columbus is the fastest-growing metro and Cleveland has a deep commercial fleet ecosystem (Sherwin-Williams, Goodyear, Progressive — many fleet contractors). Winter tire seasonal demand creates a clean revenue pattern.',
    whyHere: [
      'Low cost of entry — among the cheapest LLC filing fees and no state-level repair license.',
      'Strong winter tire seasonal demand (Oct–Dec) creates predictable revenue spikes.',
      'Columbus metro is one of the fastest-growing in the U.S. — vehicle base is expanding 2.5%+ per year.',
    ],
    watchouts: [
      'Winter logistics: salt and slush damage equipment and consumables faster than southern states. Budget 10–15% higher maintenance.',
      'Cleveland and Cincinnati have entrenched independent shop networks — differentiate clearly or focus on underserved suburbs.',
      'Ohio EPA scrap tire compliance is enforced; use registered transporters and keep manifests.',
    ],
    sosUrl: 'https://www.ohiosos.gov/businesses/',
    taxUrl: 'https://tax.ohio.gov/business/ohio-business-taxes/sales-and-use',
    epaUrl: 'https://epa.ohio.gov/divisions-and-offices/materials-and-waste-management/scrap-tires',
  },
};

export const STATE_SLUGS = Object.keys(STATE_DATA);
