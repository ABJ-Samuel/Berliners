export const METADATA_INSTRUCTIONS = `Task: extract structured metadata from the research paper text below.

- Prefer the paper's own wording for the title and abstract.
- If the abstract is not clearly present, write a faithful 2-3 sentence summary instead — do not fabricate claims.
- "commercial_signals" should capture only what the paper actually indicates (e.g. "prototype evaluated", "public dataset used", "deployment not confirmed").
- "uncertainties" should capture what a reader cannot tell from the paper.
This metadata is the structured input for later analysis, not the final recommendation.`;
