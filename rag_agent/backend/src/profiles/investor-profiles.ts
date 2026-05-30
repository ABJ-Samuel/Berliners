/**
 * Predefined investor ARCHETYPES (doc §12.3). These are generic types, never
 * real named firms — which is how Agent 4 honours the "don't invent investors"
 * rule. The fit agent scores the opportunity against these profiles.
 */
export interface InvestorProfile {
  name: string;
  type: string;
  investment_interests: string[];
  preferred_stage: string;
  preferred_business_model: string;
  risk_tolerance: 'low' | 'medium' | 'high';
  relevant_domains: string[];
}

export const INVESTOR_PROFILES: InvestorProfile[] = [
  {
    name: 'Climate Seed Investor',
    type: 'Pre-seed/seed climate fund',
    investment_interests: [
      'climate tech',
      'energy efficiency',
      'decarbonisation',
      'sustainability',
    ],
    preferred_stage: 'pre-seed / seed',
    preferred_business_model: 'paid pilot to B2B SaaS',
    risk_tolerance: 'high',
    relevant_domains: ['Energy', 'Climate', 'Industrial IoT', 'Hardware'],
  },
  {
    name: 'AI Infrastructure Investor',
    type: 'Seed/Series A deep-tech fund',
    investment_interests: [
      'AI infrastructure',
      'ML tooling',
      'edge AI',
      'developer platforms',
    ],
    preferred_stage: 'seed / Series A',
    preferred_business_model: 'usage-based or SaaS',
    risk_tolerance: 'high',
    relevant_domains: ['AI', 'ML', 'Edge Computing', 'Data'],
  },
  {
    name: 'Health DeepTech Investor',
    type: 'Specialist healthcare/biotech fund',
    investment_interests: [
      'digital health',
      'medical devices',
      'diagnostics',
      'clinical AI',
    ],
    preferred_stage: 'seed / Series A',
    preferred_business_model: 'B2B / B2B2C, regulated',
    risk_tolerance: 'medium',
    relevant_domains: ['Healthcare', 'Biotech', 'MedTech', 'AI'],
  },
  {
    name: 'Industrial Automation Investor',
    type: 'Industrial / manufacturing tech fund',
    investment_interests: [
      'industrial automation',
      'predictive maintenance',
      'factory analytics',
      'robotics',
    ],
    preferred_stage: 'seed / Series A',
    preferred_business_model: 'paid pilot to enterprise SaaS',
    risk_tolerance: 'medium',
    relevant_domains: ['Manufacturing', 'Industrial IoT', 'Robotics', 'Energy'],
  },
  {
    name: 'University Spinout Investor',
    type: 'Translational / spinout fund',
    investment_interests: [
      'research commercialisation',
      'IP-heavy deep tech',
      'TTO spinouts',
    ],
    preferred_stage: 'pre-seed',
    preferred_business_model: 'licensing or productisation',
    risk_tolerance: 'high',
    relevant_domains: ['DeepTech', 'Materials', 'AI', 'Hardware'],
  },
  {
    name: 'Corporate Innovation Team',
    type: 'Strategic corporate venture / pilot sponsor',
    investment_interests: [
      'strategic pilots',
      'co-development',
      'integration with existing operations',
    ],
    preferred_stage: 'seed onward (with a pilot)',
    preferred_business_model: 'enterprise contracts / pilots',
    risk_tolerance: 'low',
    relevant_domains: ['Industrial IoT', 'Energy', 'Manufacturing', 'Logistics'],
  },
];
