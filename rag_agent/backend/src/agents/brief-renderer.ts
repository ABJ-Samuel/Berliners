import { VentureBrief } from './schemas/venture-brief.schema';
import { CommercialReadiness } from './schemas/commercial-readiness.schema';
import { IP_NOTE } from './shared-rules';

export interface BriefSection {
  heading: string;
  body: string;
}

const bullets = (items: string[]): string =>
  items.length ? items.map((i) => `- ${i}`).join('\n') : '- (none stated)';

/** Build the venture brief sections (doc §13.2) from the structured fields. */
export function buildBriefSections(
  brief: VentureBrief,
  readiness: CommercialReadiness,
): BriefSection[] {
  return [
    { heading: 'One-liner', body: brief.one_liner },
    { heading: 'Research summary', body: brief.research_summary },
    { heading: 'Commercial opportunity', body: brief.commercial_opportunity },
    { heading: 'Target customer', body: brief.target_customer },
    { heading: 'Problem', body: brief.problem },
    { heading: 'Solution', body: brief.solution },
    { heading: 'Business model', body: brief.business_model },
    {
      heading: 'Commercial readiness',
      body: `${readiness.score}/100 — ${readiness.band}`,
    },
    { heading: 'Why now', body: brief.why_now },
    { heading: 'Risks', body: bullets([...brief.risks, IP_NOTE]) },
    { heading: 'Validation steps', body: bullets(brief.validation_steps) },
    { heading: 'Recommended founder team', body: brief.recommended_founder_team },
    {
      heading: 'Recommended investor type',
      body: brief.recommended_investor_type,
    },
    { heading: 'MVP product idea', body: brief.mvp_product_idea },
    { heading: 'Missing information', body: bullets(brief.missing_information) },
    { heading: 'IP note', body: IP_NOTE },
  ];
}

/** Deterministically render the brief to markdown from the structured fields. */
export function renderBriefMarkdown(
  brief: VentureBrief,
  readiness: CommercialReadiness,
): string {
  const lines: string[] = [`# ${brief.title}`, ''];
  for (const s of buildBriefSections(brief, readiness)) {
    lines.push(`## ${s.heading}`, '', s.body, '');
  }
  return lines.join('\n').trim();
}
