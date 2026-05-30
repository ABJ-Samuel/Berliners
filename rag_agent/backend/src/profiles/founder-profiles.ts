/**
 * Predefined founder/operator ARCHETYPES (doc §12.4). Generic profiles the fit
 * agent recommends from — never real named people.
 */
export interface FounderProfile {
  name: string;
  skills: string[];
  preferred_domain: string;
  commercial_strength: 'low' | 'medium' | 'high';
  technical_strength: 'low' | 'medium' | 'high';
  availability_assumption: string;
}

export const FOUNDER_PROFILES: FounderProfile[] = [
  {
    name: 'Scientific Founder',
    skills: ['research depth', 'algorithm design', 'domain expertise'],
    preferred_domain: 'the paper’s own research domain',
    commercial_strength: 'low',
    technical_strength: 'high',
    availability_assumption: 'often the researcher/author; part-time initially',
  },
  {
    name: 'DeepTech Engineer',
    skills: ['ML engineering', 'productionising models', 'systems/edge'],
    preferred_domain: 'AI / ML / embedded',
    commercial_strength: 'low',
    technical_strength: 'high',
    availability_assumption: 'full-time technical co-founder',
  },
  {
    name: 'B2B SaaS Operator',
    skills: ['product', 'go-to-market', 'B2B sales', 'fundraising'],
    preferred_domain: 'B2B software',
    commercial_strength: 'high',
    technical_strength: 'medium',
    availability_assumption: 'full-time commercial co-founder',
  },
  {
    name: 'Industrial Sales Founder',
    skills: ['enterprise sales', 'industrial buyer access', 'pilots'],
    preferred_domain: 'manufacturing / industrial',
    commercial_strength: 'high',
    technical_strength: 'low',
    availability_assumption: 'full-time, brings buyer relationships',
  },
  {
    name: 'Product/Growth Founder',
    skills: ['product management', 'growth', 'UX', 'analytics'],
    preferred_domain: 'software products',
    commercial_strength: 'high',
    technical_strength: 'medium',
    availability_assumption: 'full-time product lead',
  },
  {
    name: 'Regulated Market Operator',
    skills: ['regulatory navigation', 'compliance', 'clinical/industrial ops'],
    preferred_domain: 'healthcare / energy / regulated industries',
    commercial_strength: 'medium',
    technical_strength: 'low',
    availability_assumption: 'full-time operator for regulated go-to-market',
  },
];
