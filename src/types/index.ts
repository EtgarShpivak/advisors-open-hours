export interface Advisor {
  id: string;
  name: string;
  bio: string;
  photo_url: string | null;
  expertise: string[];
  stages: string[];
  verticals: string[];
  email: string | null;
  linkedin: string | null;
  active: boolean;
  available: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MeetingRequest {
  id: string;
  created_at: string;
  startup_name: string;
  company: string;
  description: string;
  linkedin: string;
  stage: string;
  arr: string;
  verticals: string[];
  help_needed: string;
  advisor_id: string;
  advisor_name: string;
  startup_email: string;
  status: 'pending' | 'approved' | 'declined';
  token: string;
  response_date?: string | null;
}

// ─── Hierarchical expertise taxonomy ─────────────────────────────────────────

export interface ExpertiseCategory {
  category: string;
  subcategories: string[];
}

export const EXPERTISE_CATEGORIES: ExpertiseCategory[] = [
  {
    category: 'Strategy & Narrative',
    subcategories: [
      'GTM Strategy & Scaling',
      'Positioning & Messaging',
      'Product Marketing',
      'Pricing & packaging',
      'Narrative & Storytelling',
    ],
  },
  {
    category: 'Growth & Demand',
    subcategories: [
      'Demand Gen & ABM',
      'Growth & Performance Marketing',
      'Content & Brand Strategy',
      'PLG',
      'Inbound & Outbound Motion',
      'Sales process & methodology',
      'Product launch',
      'AI Visibility & SEO',
    ],
  },
  {
    category: 'Operations & AI',
    subcategories: [
      'RevOps & CRM Systems',
      'AI & Marketing Automation',
      'Sales & Marketing Alignment',
      'GTM Infrastructure',
    ],
  },
  {
    category: 'Market & Ecosystem',
    subcategories: [
      'B2B Enterprise',
      'B2G',
      'B2D',
      'B2C',
      'Partnerships & Channel Marketing',
      'International Expansion and Market Penetration',
    ],
  },
  {
    category: 'Leadership & Capital',
    subcategories: [
      'Fundraising & Investor Decks',
      'GTM Team Design & Hiring',
      'M&A / Exit Readiness',
    ],
  },
];

// Flat list of all subcategories (for backward compat + DB storage)
export const EXPERTISE_OPTIONS = EXPERTISE_CATEGORIES.flatMap(c => c.subcategories);

// Quick lookup: subcategory → category name
export const SUBCATEGORY_TO_CATEGORY: Record<string, string> = {};
for (const cat of EXPERTISE_CATEGORIES) {
  for (const sub of cat.subcategories) {
    SUBCATEGORY_TO_CATEGORY[sub] = cat.category;
  }
}

// ─── Stages ──────────────────────────────────────────────────────────────────

export const STAGE_OPTIONS = [
  'Pre-seed',
  'Seed',
  'A',
  'B',
  'C',
  'D',
  'IPO',
  'Bootstrap',
] as const;

// ─── Verticals (22 items) ────────────────────────────────────────────────────

export const VERTICAL_OPTIONS = [
  'B2B SaaS',
  'Cloud IT & DevOps',
  'Cybersecurity & HLS',
  'DevTools & Engineering',
  'Generative & Agentic AI',
  'AI Ventures & Data Tech',
  'Fintech',
  'Insurtech',
  'Proptech & Real Estate',
  'HealthTech & Medical',
  'BioTech & Deep Tech',
  'Industrial IoT & Hardware',
  'Construction & Manufacturing',
  'CleanTech & Sustainability',
  'eCommerce & DTC',
  'Marketplaces',
  'Supply Chain & Logistics',
  'Retail Tech',
  'EdTech',
  'HRTech',
  'Travel & Hospitality',
  'Martech',
] as const;

// ─── ARR ─────────────────────────────────────────────────────────────────────

export const ARR_OPTIONS = [
  'Pre-revenue',
  'Under $10K',
  '$10K - $100K',
  '$100K - $1M',
  '$1M+',
] as const;

export type ExpertiseOption = (typeof EXPERTISE_OPTIONS)[number];
export type StageOption = (typeof STAGE_OPTIONS)[number];
export type VerticalOption = (typeof VERTICAL_OPTIONS)[number];
export type ArrOption = (typeof ARR_OPTIONS)[number];
