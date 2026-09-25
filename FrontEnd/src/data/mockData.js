/**
 * All mock data for the LiteCRM prototype lives here.
 *
 * There is no backend, no database and no API. Screens read this file once at
 * start-up (via `useLocalData`) and then work entirely from React state, so
 * everything resets on refresh — which is exactly what a prototype wants.
 *
 * ---------------------------------------------------------------------------
 * THE SALES PROCESS — three steps, nothing else
 * ---------------------------------------------------------------------------
 *
 *   1. LEAD                 2. CONTACT                3. DEAL
 *   ──────────────────      ────────────────────      ──────────────────────
 *   Capture a lead.         One click from a          Set the product and
 *   Mark it Qualified       qualified lead — no       the value, and the
 *   or Not Qualified.  →    form to fill in.     →    deal is created at
 *                           Log calls, emails,        Proposal, then moves:
 *                           meetings and notes        Proposal → Negotiation
 *                           against it.               → Won  or  → Lost
 *
 * Rules that the whole app follows:
 *
 *  · A lead is only ever **Qualified** or **Not Qualified**.
 *  · Moving a qualified lead to Contacts is one click; the lead leaves the
 *    leads list and becomes a contact, keeping its source and date.
 *  · Moving a contact to Deals asks for just two things — **product** and
 *    **deal value** — because those are what a deal needs and a contact
 *    does not have.
 *  · A deal is created at **Proposal** and never enters anywhere else.
 *  · The **value stays editable in Proposal and Negotiation** — that is where
 *    the number actually changes — and locks once the deal is Won or Lost.
 */

/** Returns an ISO date string (YYYY-MM-DD) offset from today by `days`. */
function dayOffset(days) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Returns a full ISO timestamp offset from now by `hours`. */
function hoursAgo(hours) {
  return new Date(Date.now() - hours * 3600000).toISOString()
}

/* ------------------------------------------------------------------ */
/* The process, as constants                                           */
/* ------------------------------------------------------------------ */

/** A lead is only ever one of these two. */
export const LEAD_STATUSES = ['Qualified', 'Not Qualified']

export const LEAD_SOURCES = ['Website', 'LinkedIn', 'Referral', 'Facebook', 'Other']

/** The Deals kanban board, left to right. */
export const DEAL_STAGES = ['Proposal', 'Negotiation', 'Won', 'Lost']

/** Every deal is created here. Nothing enters the board anywhere else. */
export const ENTRY_STAGE = 'Proposal'

/** Still in play. */
export const OPEN_STAGES = ['Proposal', 'Negotiation']

/** Finished, win or lose. */
export const CLOSED_STAGES = ['Won', 'Lost']

/** The stages where a salesperson can still change the deal value. */
export const VALUE_EDITABLE_STAGES = ['Proposal', 'Negotiation']

/** What we sell. Chosen when a contact is moved to Deals. */
export const PRODUCTS = [
  'CRM Licence',
  'Implementation',
  'Website Development',
  'Data Migration',
  'Training & Onboarding',
  'Support Retainer',
  'Analytics Add-on',
]

/**
 * ACTIVITY vs HISTORY — two different things, kept apart.
 *
 * ACTIVITY is what a person did with the customer: a call, an email, a
 * meeting, a note. A rep writes these by hand, and they are the reason to
 * open a record at all.
 *
 * HISTORY is what the system recorded: the lead was qualified, it moved to
 * Contacts, a deal was created, the value changed, the stage moved. Nobody
 * types these — they are an audit trail, and they belong in their own tab so
 * they do not bury the conversation.
 */
export const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Note', 'Follow-up']

/** System-recorded events. Never written by hand. */
export const AUDIT_TYPES = [
  'Lead captured',
  'Qualified',
  'Not qualified',
  'Moved to Contacts',
  'Deal created',
  'Value updated',
  'Stage changed',
  'Deal won',
  'Deal lost',
  'Record updated',
]

export const CONTACT_STATUSES = ['Active', 'At risk', 'Inactive']

export const INDUSTRIES = [
  'Software',
  'IT Consulting',
  'E-commerce',
  'Manufacturing',
  'Energy',
  'Healthcare',
  'Real Estate',
  'Construction',
  'Logistics',
  'Retail',
  'Education',
  'Finance',
  'Other',
]

export const TASK_PRIORITIES = ['High', 'Medium', 'Low']

export const TASK_TYPES = ['Call', 'Email', 'Meeting', 'Follow-up', 'Proposal']

export const TEAM = []
export const TEAM_NAMES = []
export const CURRENT_USER = null

/* ------------------------------------------------------------------ */
/* 1. Leads — captured, not yet moved to Contacts                      */
/* ------------------------------------------------------------------ */

const rawLeads = [
  {
    id: 'l1',
    name: 'John Smith',
    company: 'Baltic Freight',
    email: 'john@balticfreight.com',
    phone: '+91 9876543210',
    source: 'Website',
    status: 'Qualified',
    owner: '',
    createdAt: dayOffset(-2),
    notes: 'Downloaded the pricing guide. 30-person sales team, budget confirmed for Q4.',
  },
  {
    id: 'l2',
    name: 'Linnea Ek',
    company: 'Vasa Logistics',
    email: 'linnea@vasalogistics.se',
    phone: '+91 9876543210',
    source: 'Facebook',
    status: 'Qualified',
    owner: '',
    createdAt: dayOffset(-1),
    notes: 'Came through the autumn campaign. Decision maker, wants to start in November.',
  },
  {
    id: 'l3',
    name: 'Simon Hedlund',
    company: 'Orbit Software',
    email: 'simon@orbitsoft.io',
    phone: '+91 9876543210',
    source: 'LinkedIn',
    status: 'Qualified',
    owner: '',
    createdAt: dayOffset(-3),
    notes: 'Evaluating three vendors. Demo went well, procurement is ready.',
  },
  {
    id: 'l4',
    name: 'Cecilia Wallin',
    company: 'Atlas Education',
    email: 'cecilia@atlasedu.se',
    phone: '+91 9876543210',
    source: 'Website',
    status: 'Qualified',
    owner: '',
    createdAt: dayOffset(0),
    notes: 'Requested a demo through the pricing page. 40 staff, clear need.',
  },
  {
    id: 'l5',
    name: 'Fredrik Almqvist',
    company: 'Sigma Insurance',
    email: 'fredrik@sigmains.se',
    phone: '+91 9876543210',
    source: 'Referral',
    status: 'Qualified',
    owner: '',
    createdAt: dayOffset(-2),
    notes: 'Introduced by Skyline Ventures. 40+ agents, budget approved.',
  },
  {
    id: 'l6',
    name: 'Nora Hagman',
    company: 'Studio Nordlys',
    email: 'nora@nordlys.studio',
    phone: '+91 9876543210',
    source: 'Facebook',
    status: 'Qualified',
    owner: '',
    createdAt: dayOffset(0),
    notes: 'Creative agency, 6 people. Small but ready to buy this month.',
  },
  {
    id: 'l7',
    name: 'Oskar Nilsson',
    company: 'Helix Medtech',
    email: 'oskar@helixmedtech.com',
    phone: '+91 9876543210',
    source: 'LinkedIn',
    status: 'Not Qualified',
    owner: '',
    createdAt: dayOffset(-24),
    notes: 'Building an in-house tool. No budget this year — revisit in 6 months.',
  },
  {
    id: 'l8',
    name: 'Tobias Ahl',
    company: 'Kvarn Digital',
    email: 'tobias@kvarndigital.se',
    phone: '+91 9876543210',
    source: 'LinkedIn',
    status: 'Not Qualified',
    owner: '',
    createdAt: dayOffset(-30),
    notes: 'Budget cut for the year. Not a fit right now.',
  },
  {
    id: 'l9',
    name: 'Hanna Lund',
    company: 'Gröna Trädgård',
    email: 'hanna@gronatradgard.se',
    phone: '+91 9876543210',
    source: 'Website',
    status: 'Not Qualified',
    owner: '',
    createdAt: dayOffset(-27),
    notes: 'Two-person business. Too small for any paid plan.',
  },
  {
    id: 'l10',
    name: 'Martin Kjellberg',
    company: 'Nordvik Bygg',
    email: 'martin@nordvikbygg.se',
    phone: '+91 9876543210',
    source: 'Facebook',
    status: 'Not Qualified',
    owner: '',
    createdAt: dayOffset(-10),
    notes: 'Asked us to call back after their busy season. No timeline given.',
  },
  {
    id: 'l11',
    name: 'Viktor Sund',
    company: 'Havsbris Turism',
    email: 'viktor@havsbris.se',
    phone: '+91 9876543210',
    source: 'Other',
    status: 'Not Qualified',
    owner: '',
    createdAt: dayOffset(-8),
    notes: 'Met at a trade fair. Seasonal business, no clear need identified.',
  },
  {
    id: 'l12',
    name: 'Johan Berg',
    company: 'Arctic Foods',
    email: 'johan@arcticfoods.se',
    phone: '+91 9876543210',
    source: 'LinkedIn',
    status: 'Not Qualified',
    owner: '',
    createdAt: dayOffset(-1),
    notes: 'Locked into their current vendor for another year.',
  },
]

/* ------------------------------------------------------------------ */
/* 2. Contacts — every one of these came from a lead                   */
/* ------------------------------------------------------------------ */
/*
 * `source` and `movedAt` carry over from the original lead.
 * A contact with no deal yet is waiting to be moved to Deals — c14, c15 and
 * c16 below are in that state, to show that step.
 */

const rawContacts = [
  {
    id: 'c1',
    name: 'Erik Johansson',
    company: 'ABC Technologies',
    email: 'erik@abc.com',
    phone: '+91 9876543210',
    industry: 'Software',
    location: 'Stockholm, Sweden',
    owner: '',
    source: 'Website',
    movedAt: dayOffset(-420),
    lastContact: dayOffset(-2),
    status: 'Active',
  },
  {
    id: 'c2',
    name: 'Sara Nordin',
    company: 'Nordic Solutions',
    email: 'sara@nordic.com',
    phone: '+91 9876543210',
    industry: 'IT Consulting',
    location: 'Gothenburg, Sweden',
    owner: '',
    source: 'LinkedIn',
    movedAt: dayOffset(-260),
    lastContact: dayOffset(-5),
    status: 'Active',
  },
  {
    id: 'c3',
    name: 'Mikael Ek',
    company: 'TechWorld',
    email: 'mikael@techworld.com',
    phone: '+91 9876543210',
    industry: 'E-commerce',
    location: 'Malmö, Sweden',
    owner: '',
    source: 'Referral',
    movedAt: dayOffset(-180),
    lastContact: dayOffset(-9),
    status: 'Active',
  },
  {
    id: 'c4',
    name: 'Emma Lindberg',
    company: 'BluePeak Consulting',
    email: 'emma@bluepeak.se',
    phone: '+91 9876543210',
    industry: 'IT Consulting',
    location: 'Uppsala, Sweden',
    owner: '',
    source: 'Referral',
    movedAt: dayOffset(-95),
    lastContact: dayOffset(-1),
    status: 'Active',
  },
  {
    id: 'c5',
    name: 'Daniel Persson',
    company: 'Acme Corporation',
    email: 'daniel@acmecorp.com',
    phone: '+91 9876543210',
    industry: 'Manufacturing',
    location: 'Västerås, Sweden',
    owner: '',
    source: 'Website',
    movedAt: dayOffset(-640),
    lastContact: dayOffset(-21),
    status: 'At risk',
  },
  {
    id: 'c6',
    name: 'Ingrid Sandberg',
    company: 'Polaris Energy',
    email: 'ingrid@polarisenergy.com',
    phone: '+91 9876543210',
    industry: 'Energy',
    location: 'Luleå, Sweden',
    owner: '',
    source: 'Website',
    movedAt: dayOffset(-75),
    lastContact: dayOffset(-4),
    status: 'Active',
  },
  {
    id: 'c7',
    name: 'Anders Ström',
    company: 'Skyline Ventures',
    email: 'anders@skylinevc.com',
    phone: '+91 9876543210',
    industry: 'Finance',
    location: 'Stockholm, Sweden',
    owner: '',
    source: 'Referral',
    movedAt: dayOffset(-40),
    lastContact: dayOffset(-6),
    status: 'Active',
  },
  {
    id: 'c8',
    name: 'Petra Holm',
    company: 'Granit Bygg',
    email: 'petra@granitbygg.se',
    phone: '+91 9876543210',
    industry: 'Construction',
    location: 'Örebro, Sweden',
    owner: '',
    source: 'Website',
    movedAt: dayOffset(-150),
    lastContact: dayOffset(-30),
    status: 'Inactive',
  },
  {
    id: 'c9',
    name: 'Gustav Öberg',
    company: 'Meridian Labs',
    email: 'gustav@meridianlabs.com',
    phone: '+91 9876543210',
    industry: 'Healthcare',
    location: 'Lund, Sweden',
    owner: '',
    source: 'Website',
    movedAt: dayOffset(-55),
    lastContact: dayOffset(-3),
    status: 'Active',
  },
  {
    id: 'c10',
    name: 'Klara Rydberg',
    company: 'Vinter Health',
    email: 'klara@vinterhealth.se',
    phone: '+91 9876543210',
    industry: 'Healthcare',
    location: 'Umeå, Sweden',
    owner: '',
    source: 'Referral',
    movedAt: dayOffset(-30),
    lastContact: dayOffset(-8),
    status: 'Active',
  },
  {
    id: 'c11',
    name: 'Elin Wikström',
    company: 'Hammar Fastigheter',
    email: 'elin@hammarfast.se',
    phone: '+91 9876543210',
    industry: 'Real Estate',
    location: 'Linköping, Sweden',
    owner: '',
    source: 'Referral',
    movedAt: dayOffset(-210),
    lastContact: dayOffset(-14),
    status: 'At risk',
  },
  {
    id: 'c12',
    name: 'Julia Nyberg',
    company: 'Kustvind Energi',
    email: 'julia@kustvind.se',
    phone: '+91 9876543210',
    industry: 'Energy',
    location: 'Helsingborg, Sweden',
    owner: '',
    source: 'LinkedIn',
    movedAt: dayOffset(-120),
    lastContact: dayOffset(-2),
    status: 'Active',
  },
  {
    id: 'c13',
    name: 'Maria Falk',
    company: 'Norrsken Retail',
    email: 'maria@norrskenretail.se',
    phone: '+91 9876543210',
    industry: 'Retail',
    location: 'Sundsvall, Sweden',
    owner: '',
    source: 'Other',
    movedAt: dayOffset(-33),
    lastContact: dayOffset(-8),
    status: 'Active',
  },
  // --- Moved to Contacts, but no deal yet ---
  {
    id: 'c14',
    name: 'Anna Sjöberg',
    company: 'Lumen Retail Group',
    email: 'anna@lumenretail.se',
    phone: '+91 9876543210',
    industry: 'Retail',
    location: 'Norrköping, Sweden',
    owner: '',
    source: 'LinkedIn',
    movedAt: dayOffset(-3),
    lastContact: dayOffset(-3),
    status: 'Active',
  },
  {
    id: 'c15',
    name: 'Henrik Dahl',
    company: 'Terra Agri',
    email: 'henrik@terraagri.se',
    phone: '+91 9876543210',
    industry: 'Manufacturing',
    location: 'Kalmar, Sweden',
    owner: '',
    source: 'Referral',
    movedAt: dayOffset(-1),
    lastContact: dayOffset(-1),
    status: 'Active',
  },
  {
    id: 'c16',
    name: 'Sofia Bergman',
    company: 'Nordpost Logistik',
    email: 'sofia@nordpost.se',
    phone: '+91 9876543210',
    industry: 'Logistics',
    location: 'Jönköping, Sweden',
    owner: '',
    source: 'Website',
    movedAt: dayOffset(0),
    lastContact: dayOffset(0),
    status: 'Active',
  },
]

/* ------------------------------------------------------------------ */
/* recordId — the thread that survives the move                        */
/* ------------------------------------------------------------------ */
/*
 * A lead and the contact it becomes are two rows, but they are the same
 * person. `recordId` is what they share: the activity log and the history are
 * keyed by it, never by the lead id or the contact id.
 *
 * That is why activity logged on a lead is still there after the lead becomes
 * a contact — the record id did not change, only the stage did.
 */

export const leads = rawLeads.map((lead, index) => ({
  recordId: `r-l${index + 1}`,
  ...lead,
}))

export const contacts = rawContacts.map((contact, index) => ({
  recordId: `r-c${index + 1}`,
  ...contact,
}))

/* ------------------------------------------------------------------ */
/* 3. Deals — each one belongs to a contact above                      */
/* ------------------------------------------------------------------ */
/*
 * Every deal was created at Proposal, when its contact was moved to Deals
 * with a product and a value. From there it moves right.
 */

const rawDeals = [
  {
    id: 'd1',
    name: 'Website Development — ABC Technologies',
    contact: 'ABC Technologies',
    product: 'Website Development',
    value: 8500,
    stage: 'Proposal',
    closeDate: dayOffset(9),
    owner: '',
    createdAt: dayOffset(-20),
    notes: 'Full redesign plus CRM integration. Proposal sent, awaiting feedback.',
  },
  {
    id: 'd2',
    name: 'Implementation — Nordic Solutions',
    contact: 'Nordic Solutions',
    product: 'Implementation',
    value: 12000,
    stage: 'Negotiation',
    closeDate: dayOffset(16),
    owner: '',
    createdAt: dayOffset(-34),
    notes: 'Negotiating a 3-year term. Legal review in progress.',
  },
  {
    id: 'd3',
    name: 'CRM Licence — TechWorld',
    contact: 'TechWorld',
    product: 'CRM Licence',
    value: 6400,
    stage: 'Proposal',
    closeDate: dayOffset(24),
    owner: '',
    createdAt: dayOffset(-8),
    notes: 'Quote sent after the workflow demo.',
  },
  {
    id: 'd4',
    name: 'Training & Onboarding — BluePeak Consulting',
    contact: 'BluePeak Consulting',
    product: 'Training & Onboarding',
    value: 4200,
    stage: 'Won',
    closeDate: dayOffset(-3),
    owner: '',
    createdAt: dayOffset(-45),
    notes: 'Signed. Kick-off scheduled with their delivery team.',
  },
  {
    id: 'd5',
    name: 'CRM Licence — Acme Corporation',
    contact: 'Acme Corporation',
    product: 'CRM Licence',
    value: 18500,
    stage: 'Negotiation',
    closeDate: dayOffset(28),
    owner: '',
    createdAt: dayOffset(-60),
    notes: 'Renewal at risk — they are benchmarking two competitors.',
  },
  {
    id: 'd6',
    name: 'Analytics Add-on — Polaris Energy',
    contact: 'Polaris Energy',
    product: 'Analytics Add-on',
    value: 3800,
    stage: 'Proposal',
    closeDate: dayOffset(38),
    owner: '',
    createdAt: dayOffset(-2),
    notes: 'Inbound interest after the reporting webinar.',
  },
  {
    id: 'd7',
    name: 'Implementation — Skyline Ventures',
    contact: 'Skyline Ventures',
    product: 'Implementation',
    value: 22000,
    stage: 'Negotiation',
    closeDate: dayOffset(20),
    owner: '',
    createdAt: dayOffset(-18),
    notes: 'Three portfolio companies, staged rollout over two quarters.',
  },
  {
    id: 'd8',
    name: 'CRM Licence — Granit Bygg',
    contact: 'Granit Bygg',
    product: 'CRM Licence',
    value: 2400,
    stage: 'Lost',
    closeDate: dayOffset(-10),
    owner: '',
    createdAt: dayOffset(-50),
    notes: 'Lost on price. Chose a cheaper regional tool.',
  },
  {
    id: 'd9',
    name: 'Data Migration — ABC Technologies',
    contact: 'ABC Technologies',
    product: 'Data Migration',
    value: 5600,
    stage: 'Won',
    closeDate: dayOffset(-12),
    owner: '',
    createdAt: dayOffset(-55),
    notes: 'Migrated 40k records from their legacy system.',
  },
  {
    id: 'd10',
    name: 'Support Retainer — Nordic Solutions',
    contact: 'Nordic Solutions',
    product: 'Support Retainer',
    value: 7200,
    stage: 'Proposal',
    closeDate: dayOffset(45),
    owner: '',
    createdAt: dayOffset(-1),
    notes: 'Early quote for next year’s support contract.',
  },
  {
    id: 'd11',
    name: 'Analytics Add-on — TechWorld',
    contact: 'TechWorld',
    product: 'Analytics Add-on',
    value: 4900,
    stage: 'Proposal',
    closeDate: dayOffset(31),
    owner: '',
    createdAt: dayOffset(-6),
    notes: 'Wants custom dashboards for their regional managers.',
  },
  {
    id: 'd12',
    name: 'Implementation — Polaris Energy',
    contact: 'Polaris Energy',
    product: 'Implementation',
    value: 9800,
    stage: 'Won',
    closeDate: dayOffset(-6),
    owner: '',
    createdAt: dayOffset(-40),
    notes: 'Connected to their field-service platform.',
  },
  {
    id: 'd13',
    name: 'Implementation — Meridian Labs',
    contact: 'Meridian Labs',
    product: 'Implementation',
    value: 11400,
    stage: 'Negotiation',
    closeDate: dayOffset(14),
    owner: '',
    createdAt: dayOffset(-12),
    notes: 'Haggling over the migration scope. Value may come down.',
  },
  {
    id: 'd14',
    name: 'CRM Licence — Vinter Health',
    contact: 'Vinter Health',
    product: 'CRM Licence',
    value: 15600,
    stage: 'Negotiation',
    closeDate: dayOffset(22),
    owner: '',
    createdAt: dayOffset(-26),
    notes: 'GDPR documentation under review by their DPO.',
  },
  {
    id: 'd15',
    name: 'Implementation — Hammar Fastigheter',
    contact: 'Hammar Fastigheter',
    product: 'Implementation',
    value: 6800,
    stage: 'Proposal',
    closeDate: dayOffset(35),
    owner: '',
    createdAt: dayOffset(-9),
    notes: 'Shared inbox view is the deciding feature.',
  },
  {
    id: 'd16',
    name: 'Analytics Add-on — Kustvind Energi',
    contact: 'Kustvind Energi',
    product: 'Analytics Add-on',
    value: 9200,
    stage: 'Won',
    closeDate: dayOffset(-4),
    owner: '',
    createdAt: dayOffset(-15),
    notes: 'Bundled into year one, as they asked.',
  },
  {
    id: 'd17',
    name: 'Analytics Add-on — Norrsken Retail',
    contact: 'Norrsken Retail',
    product: 'Analytics Add-on',
    value: 3400,
    stage: 'Won',
    closeDate: dayOffset(-8),
    owner: '',
    createdAt: dayOffset(-33),
    notes: 'Closed ahead of their Q4 campaign.',
  },
  {
    id: 'd18',
    name: 'Data Migration — Norrsken Retail',
    contact: 'Norrsken Retail',
    product: 'Data Migration',
    value: 5200,
    stage: 'Lost',
    closeDate: dayOffset(-5),
    owner: '',
    createdAt: dayOffset(-38),
    notes: 'They kept the migration in-house.',
  },
]

/**
 * Every deal carries the `recordId` of the contact it belongs to, so the Deals
 * board can read the same activity log and history the Contacts page shows —
 * without looking anything up.
 */
export const deals = rawDeals.map((deal) => ({
  recordId: rawContacts.find((contact) => contact.company === deal.contact)
    ? contacts.find((contact) => contact.company === deal.contact).recordId
    : undefined,
  ...deal,
}))

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export const tasks = [
  {
    id: 't1',
    title: 'Call ABC Technologies',
    contact: 'ABC Technologies',
    dueDate: dayOffset(0),
    dueTime: '15:00',
    owner: '',
    priority: 'High',
    type: 'Call',
    completed: false,
    notes: 'Walk through the proposal and confirm the onboarding timeline.',
  },
  {
    id: 't2',
    title: 'Follow up with Nordic Solutions',
    contact: 'Nordic Solutions',
    dueDate: dayOffset(1),
    dueTime: '10:30',
    owner: '',
    priority: 'Medium',
    type: 'Follow-up',
    completed: false,
    notes: 'Check whether legal has finished the contract review.',
  },
  {
    id: 't3',
    title: 'Revise the TechWorld quote',
    contact: 'TechWorld',
    dueDate: dayOffset(5),
    dueTime: '09:00',
    owner: '',
    priority: 'High',
    type: 'Proposal',
    completed: false,
    notes: 'They asked for the analytics add-on to be included.',
  },
  {
    id: 't4',
    title: 'Prepare renewal deck for Acme Corporation',
    contact: 'Acme Corporation',
    dueDate: dayOffset(3),
    dueTime: '14:00',
    owner: '',
    priority: 'High',
    type: 'Meeting',
    completed: false,
    notes: 'Highlight usage growth and the support SLA.',
  },
  {
    id: 't5',
    title: 'Negotiation call with Skyline Ventures',
    contact: 'Skyline Ventures',
    dueDate: dayOffset(2),
    dueTime: '11:00',
    owner: '',
    priority: 'Medium',
    type: 'Meeting',
    completed: false,
    notes: 'Expect pushback on the rollout fee — be ready to adjust the value.',
  },
  {
    id: 't6',
    title: 'Agree product and value with Lumen Retail Group',
    contact: 'Lumen Retail Group',
    dueDate: dayOffset(0),
    dueTime: '17:00',
    owner: '',
    priority: 'High',
    type: 'Call',
    completed: false,
    notes: 'New contact — settle this and they can be moved to Deals.',
  },
  {
    id: 't7',
    title: 'Send contract to BluePeak Consulting',
    contact: 'BluePeak Consulting',
    dueDate: dayOffset(-2),
    dueTime: '12:00',
    owner: '',
    priority: 'High',
    type: 'Email',
    completed: true,
    notes: 'Signed and countersigned.',
  },
  {
    id: 't8',
    title: 'Check in with Granit Bygg',
    contact: 'Granit Bygg',
    dueDate: dayOffset(-4),
    dueTime: '13:30',
    owner: '',
    priority: 'Low',
    type: 'Follow-up',
    completed: false,
    notes: 'Overdue — they went quiet after the pricing discussion.',
  },
  {
    id: 't9',
    title: 'Quarterly review with Polaris Energy',
    contact: 'Polaris Energy',
    dueDate: dayOffset(8),
    dueTime: '09:30',
    owner: '',
    priority: 'Medium',
    type: 'Meeting',
    completed: false,
    notes: 'Review adoption numbers and the integration roadmap.',
  },
  {
    id: 't10',
    title: 'Qualify lead — Atlas Education',
    contact: 'Atlas Education',
    dueDate: dayOffset(-1),
    dueTime: '16:00',
    owner: '',
    priority: 'Medium',
    type: 'Call',
    completed: true,
    notes: 'Qualified — ready to move to Contacts.',
  },
  {
    id: 't11',
    title: 'Agree scope with Terra Agri',
    contact: 'Terra Agri',
    dueDate: dayOffset(-6),
    dueTime: '11:15',
    owner: '',
    priority: 'High',
    type: 'Call',
    completed: false,
    notes: 'Overdue — still waiting on their product decision.',
  },
  {
    id: 't12',
    title: 'Book kick-off with BluePeak delivery team',
    contact: 'BluePeak Consulting',
    dueDate: dayOffset(4),
    dueTime: '10:00',
    owner: '',
    priority: 'Medium',
    type: 'Meeting',
    completed: false,
    notes: 'Coordinate with their project manager.',
  },
]

/* ------------------------------------------------------------------ */
/* Activity feed                                                       */
/* ------------------------------------------------------------------ */

export const activities = [
  {
    id: 'a1',
    type: 'Call',
    actor: '',
    description: 'logged a call with ABC Technologies',
    detail: 'Proposal walkthrough · discussed scope and timeline.',
    company: 'ABC Technologies',
    timestamp: hoursAgo(2),
  },
  {
    id: 'a2',
    type: 'Moved to Contacts',
    actor: '',
    description: 'moved a lead to Contacts — Nordpost Logistik',
    detail: 'Sofia Bergman · from Website.',
    company: 'Nordpost Logistik',
    timestamp: hoursAgo(4),
  },
  {
    id: 'a3',
    type: 'Deal created',
    actor: '',
    description: 'moved Nordic Solutions to Deals',
    detail: 'Support Retainer · $7,200 · created at Proposal.',
    company: 'Nordic Solutions',
    timestamp: hoursAgo(6),
  },
  {
    id: 'a4',
    type: 'Value updated',
    actor: '',
    description: 'changed the value of Analytics Add-on — Kustvind Energi',
    detail: '$8,400 → $9,200 during Negotiation.',
    company: 'Kustvind Energi',
    timestamp: hoursAgo(9),
  },
  {
    id: 'a5',
    type: 'Email',
    actor: '',
    description: 'logged an email with Hammar Fastigheter',
    detail: 'Sent the shared-inbox walkthrough.',
    company: 'Hammar Fastigheter',
    timestamp: hoursAgo(26),
  },
  {
    id: 'a6',
    type: 'Meeting',
    actor: '',
    description: 'logged a meeting with Skyline Ventures',
    detail: 'Walked through multi-company reporting.',
    company: 'Skyline Ventures',
    timestamp: hoursAgo(31),
  },
  {
    id: 'a7',
    type: 'Deal won',
    actor: '',
    description: 'moved Implementation — Polaris Energy to Won',
    detail: 'Polaris Energy · $9,800.',
    company: 'Polaris Energy',
    timestamp: hoursAgo(50),
  },
  {
    id: 'a8',
    type: 'Note',
    actor: '',
    description: 'logged a note with Acme Corporation',
    detail: 'Renewal at risk, benchmarking two competitors.',
    company: 'Acme Corporation',
    timestamp: hoursAgo(72),
  },
]

/**
 * ACTIVITY LOG — what people did, written by a rep.
 *
 * Keyed by `recordId`, not by lead id or contact id, so a call logged while
 * the record was still a lead is still there once it becomes a contact.
 * Only the five ACTIVITY_TYPES ever appear here.
 */
export const activityLog = {
  // --- still leads ---
  'r-l1': [
    { id: 'l1a1', type: 'Call', title: 'Qualification call', detail: 'Confirmed budget and a Q4 start. Worth moving across.', actor: '', timestamp: hoursAgo(20) },
    { id: 'l1a2', type: 'Note', title: 'Team size', detail: '30 sellers across two offices.', actor: '', timestamp: hoursAgo(44) },
  ],
  'r-l3': [
    { id: 'l3a1', type: 'Meeting', title: 'Product demo', detail: 'Walked through the pipeline board. Positive.', actor: '', timestamp: hoursAgo(52) },
  ],
  'r-l7': [
    { id: 'l7a1', type: 'Call', title: 'Discovery call', detail: 'Building in-house. Nothing to sell them this year.', actor: '', timestamp: hoursAgo(560) },
  ],
  // --- now contacts ---
  'r-c1': [
    { id: 'c1a1', type: 'Call', title: 'Proposal walkthrough', detail: 'Reviewed scope and timeline with Erik.', actor: '', timestamp: hoursAgo(2) },
    { id: 'c1a3', type: 'Note', title: 'Expansion interest', detail: 'Mentioned a second team joining in Q1.', actor: '', timestamp: hoursAgo(120) },
    { id: 'c1a4', type: 'Meeting', title: 'Quarterly review', detail: 'Adoption up 18% quarter over quarter.', actor: '', timestamp: hoursAgo(360) },
  ],
  'r-c2': [
    { id: 'c2a1', type: 'Follow-up', title: 'Contract review check-in', detail: 'Legal expects to sign off this week.', actor: '', timestamp: hoursAgo(5) },
    { id: 'c2a3', type: 'Meeting', title: 'Implementation planning', detail: 'Agreed on a phased rollout.', actor: '', timestamp: hoursAgo(200) },
  ],
  'r-c3': [
    { id: 'c3a1', type: 'Call', title: 'Discovery call', detail: 'Mapped their current sales process.', actor: '', timestamp: hoursAgo(40) },
    { id: 'c3a2', type: 'Note', title: 'Custom dashboards', detail: 'Regional managers want their own views.', actor: '', timestamp: hoursAgo(90) },
  ],
  'r-c4': [
    { id: 'c4a2', type: 'Meeting', title: 'Kick-off planning', detail: 'Delivery team introduced.', actor: '', timestamp: hoursAgo(70) },
  ],
  'r-c5': [
    { id: 'c5a1', type: 'Note', title: 'Renewal risk', detail: 'Benchmarking two competitors before renewing.', actor: '', timestamp: hoursAgo(72) },
    { id: 'c5a2', type: 'Call', title: 'Usage review', detail: 'Seat usage down 12% since spring.', actor: '', timestamp: hoursAgo(300) },
  ],
  'r-c6': [
    { id: 'c6a2', type: 'Meeting', title: 'Integration go-live', detail: 'Connected to their field-service platform.', actor: '', timestamp: hoursAgo(140) },
  ],
  'r-c7': [
    { id: 'c7a1', type: 'Meeting', title: 'Product demo', detail: 'Focused on multi-company reporting.', actor: '', timestamp: hoursAgo(31) },
  ],
  'r-c8': [
    { id: 'c8a1', type: 'Follow-up', title: 'Pricing follow-up', detail: 'No response after the revised quote.', actor: '', timestamp: hoursAgo(700) },
  ],
  'r-c9': [
    { id: 'c9a2', type: 'Note', title: 'Trial results', detail: 'Strong usage across both lab teams.', actor: '', timestamp: hoursAgo(260) },
  ],
  'r-c10': [
    { id: 'c10a1', type: 'Note', title: 'GDPR review', detail: 'Their DPO is reviewing our documentation.', actor: '', timestamp: hoursAgo(60) },
    { id: 'c10a2', type: 'Meeting', title: 'Clinic walkthrough', detail: 'Demoed scheduling and follow-up flows.', actor: '', timestamp: hoursAgo(180) },
  ],
  'r-c11': [
    { id: 'c11a1', type: 'Email', title: 'Shared-inbox walkthrough', detail: 'Sent the feature overview they asked for.', actor: '', timestamp: hoursAgo(26) },
    { id: 'c11a2', type: 'Call', title: 'Renewal check-in', detail: 'Usage has dropped since the summer.', actor: '', timestamp: hoursAgo(330) },
  ],
  'r-c12': [
    { id: 'c12a2', type: 'Follow-up', title: 'Pricing agreed', detail: 'Bundled analytics into year one.', actor: '', timestamp: hoursAgo(9) },
  ],
  'r-c13': [
    { id: 'c13a2', type: 'Email', title: 'Campaign recap', detail: 'Sent the Q4 numbers they asked for.', actor: '', timestamp: hoursAgo(190) },
  ],
  'r-c14': [
    { id: 'c14a2', type: 'Call', title: 'Intro call', detail: 'Scoping which product fits. No value agreed yet.', actor: '', timestamp: hoursAgo(50) },
  ],
  // r-c15 and r-c16 have no activity yet — they show the empty state.
}

/* ------------------------------------------------------------------ */
/* HISTORY — the audit trail, generated, never typed                   */
/* ------------------------------------------------------------------ */
/*
 * Built from the records themselves so it can never drift out of step with
 * them. In a real application these rows would be written by the server as
 * each change happened.
 */

/** Turns a YYYY-MM-DD into a timestamp at a given hour, for readable ordering. */
function atDate(isoDate, hour = 9) {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setHours(hour)
  return date.toISOString()
}

function money(amount) {
  return `$${(Number(amount) || 0).toLocaleString('en-US')}`
}

function buildAuditLog() {
  const log = {}
  let seed = 0
  const push = (recordId, entry) => {
    if (!recordId) return
    log[recordId] = [...(log[recordId] ?? []), { id: `au${(seed += 1)}`, ...entry }]
  }

  // Leads: captured, then qualified or not.
  leads.forEach((lead) => {
    push(lead.recordId, {
      type: 'Lead captured',
      title: 'Lead captured',
      detail: `${lead.company} · from ${lead.source}.`,
      actor: lead.owner,
      timestamp: atDate(lead.createdAt, 9),
    })
    push(lead.recordId, {
      type: lead.status === 'Qualified' ? 'Qualified' : 'Not qualified',
      title: `Marked ${lead.status}`,
      detail: lead.status === 'Qualified' ? 'Ready to move to Contacts.' : 'Not a fit for now.',
      actor: lead.owner,
      timestamp: atDate(lead.createdAt, 14),
    })
  })

  // Contacts: they were a lead first, then they moved.
  contacts.forEach((contact) => {
    push(contact.recordId, {
      type: 'Lead captured',
      title: 'Lead captured',
      detail: `${contact.company} · from ${contact.source}.`,
      actor: contact.owner,
      timestamp: atDate(contact.movedAt, 8),
    })
    push(contact.recordId, {
      type: 'Qualified',
      title: 'Marked Qualified',
      detail: 'Ready to move to Contacts.',
      actor: contact.owner,
      timestamp: atDate(contact.movedAt, 9),
    })
    push(contact.recordId, {
      type: 'Moved to Contacts',
      title: 'Moved from Leads to Contacts',
      detail: 'Became a contact record.',
      actor: contact.owner,
      timestamp: atDate(contact.movedAt, 10),
    })
  })

  // Deals: created at Proposal, and whatever happened to them since.
  deals.forEach((deal) => {
    const contact = contacts.find((item) => item.company === deal.contact)
    if (!contact) return

    push(contact.recordId, {
      type: 'Deal created',
      title: deal.name,
      detail: `Created at ${ENTRY_STAGE} · ${deal.product} · ${money(deal.value)}.`,
      deal: deal.name,
      actor: deal.owner,
      timestamp: atDate(deal.createdAt, 11),
    })

    if (deal.stage === 'Negotiation') {
      push(contact.recordId, {
        type: 'Stage changed',
        title: `${deal.name} moved to Negotiation`,
        detail: 'Proposal → Negotiation.',
        deal: deal.name,
        actor: deal.owner,
        timestamp: atDate(deal.createdAt, 15),
      })
    }

    if (deal.stage === 'Won' || deal.stage === 'Lost') {
      push(contact.recordId, {
        type: deal.stage === 'Won' ? 'Deal won' : 'Deal lost',
        title: `${deal.name} marked ${deal.stage}`,
        detail: `${money(deal.value)} · value locked.`,
        deal: deal.name,
        actor: deal.owner,
        timestamp: atDate(deal.closeDate, 16),
      })
    }
  })

  // One hand-written entry, so a value change is visible in the demo.
  push('r-c12', {
    type: 'Value updated',
    title: 'Value changed on Analytics Add-on — Kustvind Energi',
    detail: '$8,400 → $9,200 during Negotiation.',
    deal: 'Analytics Add-on — Kustvind Energi',
    actor: '',
    timestamp: hoursAgo(9),
  })

  // Newest first, everywhere.
  Object.keys(log).forEach((key) => {
    log[key].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  })
  return log
}

export const auditLog = buildAuditLog()

/* ------------------------------------------------------------------ */
/* Notifications (header dropdown)                                     */
/* ------------------------------------------------------------------ */

export const notifications = [
  { id: 'n1', title: 'Lead moved to Contacts', body: 'Nordpost Logistik is now a contact.', timestamp: hoursAgo(4), unread: true },
  { id: 'n2', title: 'Deal value changed', body: 'Kustvind Energi raised to $9,200.', timestamp: hoursAgo(9), unread: true },
  { id: 'n3', title: 'Task due today', body: 'Call ABC Technologies at 3:00 PM.', timestamp: hoursAgo(7), unread: true },
  { id: 'n4', title: 'Deal won', body: 'Implementation — Polaris Energy closed at $9,800.', timestamp: hoursAgo(50), unread: false },
]

/* ------------------------------------------------------------------ */
/* Reports — figures that are not derived from the live state          */
/* ------------------------------------------------------------------ */

/** Monthly trend used by the Reports page revenue chart. */
export const monthlyRevenue = [
  { month: 'Apr', revenue: 18400, deals: 9 },
  { month: 'May', revenue: 21200, deals: 11 },
  { month: 'Jun', revenue: 19800, deals: 10 },
  { month: 'Jul', revenue: 24600, deals: 12 },
  { month: 'Aug', revenue: 26100, deals: 13 },
  { month: 'Sep', revenue: 28400, deals: 15 },
]
