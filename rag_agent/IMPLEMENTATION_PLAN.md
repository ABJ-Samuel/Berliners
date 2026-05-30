# Lab2Venture AI — MVP Implementation Plan

> Manual research-PDF → structured startup/investor recommendation brief.
> This document is a **build plan only** — no application code is written yet.
> Reflects the full design doc through §16, with **ingestion and recommendation kept as two separate jobs**.

---

## 0. TL;DR — the single most important finding

You already have ~70% of this MVP built in **`rag_agent/`** (a NestJS 11 + TypeScript backend).
It already implements *the entire ingestion + embedding + retrieval layer* from the design doc:

| Design-doc requirement | Already in `rag_agent`? | File |
|---|---|---|
| PDF upload endpoint | ✅ | `rag/routes/ingest.controller.ts` (`POST /ingest`, multipart, PDF-only) |
| PDF text extraction (per page) | ✅ | `rag/services/pdf-parser.service.ts` (pdfjs-dist legacy) |
| Text cleaning / normalization | ✅ (basic) | `chunker.service.ts#normalize` |
| Chunking (800–1200 tok + overlap) | ✅ | `chunker.service.ts` (configurable via env) |
| Embeddings | ✅ | `vertex-embeddings.service.ts` (`text-embedding-004`, 768-dim) |
| pgvector storage + ANN index | ✅ | `db/migration.runner.ts` (`documents`, `chunks`, ivfflat) |
| Semantic retrieval (cosine top-K) | ✅ | `retrieve.service.ts` (`POST /retrieve`) |
| Postgres + pgvector infra | ✅ | `docker-compose.yml` (`pgvector/pgvector:pg16`) |
| Config validation (zod env) | ✅ | `config/env.ts` |
| Agent scaffold | ⚠️ placeholder only | `agents/agent-router.service.ts` (does retrieval, no LLM) |

**What is genuinely NOT built yet (= the actual work):**
1. **An LLM *generation* provider.** There is only an *embeddings* client. Every agent needs text generation. **Biggest gap.**
2. **Two separate async jobs** — an **ingestion** job and a **recommendation** job, kept apart on purpose. Each runs `QUEUED → PROCESSING → COMPLETED/FAILED` with its own `progress` % the UI polls.
3. **Metadata extraction** (title, abstract, domains, methods, applications, commercial signals — §6.8) — part of *ingestion*.
4. **Multi-intent context-package builder** driven by 9 fixed commercialisation queries (§7.5 / §14.2) — first step of *recommendation*.
5. **Shared agent grounding rules** (§8.3) — a system-prompt contract every agent obeys (no invented patents/investors/customers; facts vs assumptions; confidence scores).
6. **The 5 recommendation agents** with their *exact* output schemas + 2 scoring rubrics (§9–13).
7. **Predefined investor + founder profiles** as static seed data the fit agent scores against (§12.3–12.4).
8. **Result storage** as the canonical result object (§15) + **read/dashboard endpoints**, the on-demand **`/fit`** investor endpoint (§4.2), and an **`agent_outputs`** audit trail behind every LLM call.

**Approach (confirmed):** extend **`rag_agent/backend` in place** — no fresh project, no Python worker. Generation runs on **Claude (Anthropic SDK)**; embeddings stay on Vertex.

---

## 1. Tech-stack decisions (with rationale)

| # | Decision | Choice | Rationale | Alternative |
|---|---|---|---|---|
| D1 | Language / framework | **TypeScript + NestJS 11** | Reuse the working `rag_agent` foundation. | Python/FastAPI rewrite (rejected) |
| D2 | Where to build | **✔ Extend `rag_agent/backend` in place** | No duplication; new modules slot in | Fresh `research-agent/` copy (rejected) |
| D3 | Embeddings | **Keep Vertex `text-embedding-004` (768-dim)** | Already wired; schema matches `vector(768)` | OpenAI embeddings (new auth + dim change) |
| D4 | **LLM generation** | **✔ Anthropic Claude** behind a provider-agnostic `LlmService` — forced tool-use for structured output + **prompt caching** of the shared context | Best structured-output reliability; caching makes all recommendation agents reuse the same context cheaply (§6.7) | Vertex Gemini (drop-in swap) |
| D5 | Database | **Postgres + pgvector** (existing compose) | Already running; doc wants Postgres + vectors | — |
| D6 | Job / async processing | **✔ Two separate in-process JS/TS jobs — `ingestion` and `recommendation`** (no Python/Redis/Celery/queue), each with its own `status`+`progress`+`current_step` in Postgres; UI polls | **Kept apart (per request):** re-run recommendation without re-ingesting; clean separation of concerns; ingestion stays useful even before any recommendation runs | `pg`-backed poll loop (still TS) for restart durability |
| D7 | File storage | **Local disk** (`LocalStorageService`), GCS optional behind `DISABLE_GCS` | Doc says local; flag already exists | GCS (already present) |
| D8 | Validation/parsing | **zod** for all I/O + every agent output | Project convention | — |
| D9 | Auth / tenancy | **`tenantId` field only, no auth** for MVP | Out of scope; already threaded | Add auth post-MVP |

---

## 2. Architecture — two decoupled jobs

```
  UI (built separately — out of scope)

  ── JOB A: INGESTION ──────────────────────────────────────────────┐
  POST /assets (PDF)                                                  │
   → create documents row + ingestion job (QUEUED)                    │
   → save PDF → pdf-parser → chunker → vertex-embeddings → db(chunks) │
   → metadata.agent (§6.8) → documents.metadata                       │
   ⇒ ingestion job COMPLETED  (asset is now "ready")                  │
  ───────────────────────────────────────────────────────────────────┘
                         │  asset ready
                         ▼  (explicit trigger; optional auto-chain via env flag)
  ── JOB B: RECOMMENDATION ─────────────────────────────────────────┐
  POST /assets/:id/recommend                                          │
   → create recommendation job (QUEUED)                               │
   → context-package.service: 9 fixed queries → dedupe → ctx          │
   → orchestrator (each = LlmService.generate(schema)):               │
       research-understanding → commercial-readiness                  │
       → startup-opportunity → investor-fit → venture-brief           │
       (investor-fit reads static investor/founder profiles)          │
   → assemble + persist result object (§15)                           │
   ⇒ recommendation job COMPLETED                                     │
  ───────────────────────────────────────────────────────────────────┘
                         │
                         ▼  GET /assets/:id · /recommendation · /brief   (dashboard data)
```

The two jobs are independent: ingestion has value on its own (retrievable asset), and recommendation can be **re-run** any number of times against an already-ingested asset. Every agent call is wrapped by the **shared grounding rules** (§6.2) and returns a **zod-validated** object.

---

## 3. Data model

Migrations stay idempotent (`CREATE … IF NOT EXISTS`, `ALTER … ADD COLUMN IF NOT EXISTS`).

### 3.1 Reuse / extend existing tables
- **`documents`** = the *research asset*. **Add:** `page_count int`, `byte_size bigint`, `storage_path text`, `metadata jsonb` (the §6.8 extraction), `ingest_status text DEFAULT 'pending'` (quick filter: pending|ready|failed), `updated_at timestamptz`.
- **`chunks`** — keep as-is. **Add** `section text` (nullable; often null — see §10).

### 3.2 New tables
```
jobs                              -- ONE row per run; two kinds, kept apart
  id uuid pk, document_id uuid fk → documents(id) ON DELETE CASCADE,
  kind text NOT NULL,                      -- 'ingestion' | 'recommendation'
  status text NOT NULL DEFAULT 'QUEUED',   -- QUEUED | PROCESSING | COMPLETED | FAILED
  progress int NOT NULL DEFAULT 0,         -- 0..100  (per-kind mapping in §8)
  current_step text,                       -- e.g. 'Scoring readiness'
  error text,
  created_at timestamptz default now(), updated_at timestamptz default now()
  -- latest ingestion job → asset readiness; latest recommendation job → recommendation status

recommendations                   -- stored agent outputs; field names match the result object (§7)
  id uuid pk, document_id uuid fk, job_id uuid fk → jobs(id),   -- the recommendation job
  readiness_score numeric, readiness_band text,   -- denormalized for fast dashboard list/sort
  research_understanding jsonb,
  commercial_readiness   jsonb,
  startup_opportunity    jsonb,
  investor_founder_fit   jsonb,
  venture_brief          jsonb,
  brief_md text,                                  -- rendered markdown brief
  created_at timestamptz default now()

agent_outputs                     -- audit row per LLM call (every agent + metadata + /fit); written by LlmService
  id uuid pk, document_id uuid fk, job_id uuid fk → jobs(id) NULL,   -- job_id NULL for synchronous /fit
  agent_name text NOT NULL,                -- 'metadata' | 'research_understanding' | … | 'investor_fit_on_demand'
  model text, input_summary text, output jsonb,
  latency_ms int, prompt_tokens int, completion_tokens int, cache_read_tokens int,
  created_at timestamptz default now()

fit_analyses                      -- on-demand investor/founder fit from POST /assets/:id/fit (§4.2)
  id uuid pk, document_id uuid fk → documents(id) ON DELETE CASCADE,
  input_profile jsonb NOT NULL,            -- the company/investor/founder profile the user supplied
  result jsonb NOT NULL,                   -- match_score, breakdown, reason, concerns, next_steps
  created_at timestamptz default now()

venture_brief_embeddings          -- OPTIONAL (doc §7.2: embed brief after completion)
  recommendation_id uuid fk, embedding vector(768)
```
- A document may have **1 ingestion job + N recommendation jobs** (re-runs). "Latest job per kind" gives current status.
- **`metadata` lives on `documents`** (written by the ingestion job), the recommendation blocks on `recommendations`. The §15 *result object* is a **read-model DTO** assembled from `documents` + the two latest `jobs` + `recommendations` — not a 1:1 table.
- **`agent_outputs`** is written by `LlmService` on every call (tokens, latency, cache reads) → traceability + a debug `GET /assets/:id/agent-outputs`.

---

## 4. Module / file layout

Under `rag_agent/backend/src` (✅ reuse, ✏️ extend, 🆕 new):

```
config/env.ts            ✏️ + ANTHROPIC_API_KEY, LLM_PROVIDER, LLM_MODEL, MAX_UPLOAD_MB(20),
                            MAX_PAGES(50), STORAGE_DIR, AUTO_RECOMMEND(false)
db/migration.runner.ts   ✏️ + columns, jobs, recommendations, (opt) brief embeddings
storage/local-storage.service.ts            🆕 save/read PDF bytes under STORAGE_DIR
rag/services/pdf-parser.service.ts          ✏️ return pageCount + per-page char counts (scanned detection)
rag/services/ingest.service.ts              ✏️ driven by the ingestion job; write progress; store chunk.section
rag/services/retrieve.service.ts            ✏️ add retrieveForIntent(documentId, query, k)
rag/services/context-package.service.ts     🆕 9 fixed queries → dedupe → ContextPackage (§6.1)
llm/llm.service.ts                          🆕 generate<T>({system,user,schema,cacheKey})
llm/anthropic.provider.ts                   🆕 default (forced tool-use JSON + prompt caching)
llm/vertex-gemini.provider.ts               🆕 alt stub
observability/agent-output.recorder.ts      🆕 writes one agent_outputs row per LLM call (called inside LlmService)
assets/assets.controller.ts                 🆕 POST /assets, GET /assets, GET /assets/:id
assets/assets.service.ts                    🆕 create/validate/fetch result object
jobs/ingestion.runner.ts                    🆕 JOB A: save → parse → chunk → embed → metadata; updates progress
jobs/recommendation.runner.ts               🆕 JOB B: context → orchestrator → store; updates progress
agents/shared-rules.ts                       🆕 the §8.3 grounding contract (shared system-prompt prefix)
agents/recommendation.orchestrator.ts        🆕 runs the 5 agents in sequence + persists
agents/recommendation.controller.ts          🆕 POST /assets/:id/recommend + /fit; GET .../recommendation, /brief, /agent-outputs
agents/fit.service.ts                         🆕 on-demand fit: scores a user-supplied profile vs the asset (§6.9)
agents/metadata.agent.ts                      🆕 §6.8  (runs in JOB A → documents.metadata)
agents/research-understanding.agent.ts        🆕 §9
agents/commercial-readiness.agent.ts          🆕 §10  (7-part rubric + bands + IP note)
agents/startup-opportunity.agent.ts           🆕 §11
agents/investor-fit.agent.ts                  🆕 §12  (dual mode: batch vs 6 archetypes AND on-demand vs a supplied profile)
agents/venture-brief.agent.ts                 🆕 §13  (assembles brief + markdown)
agents/schemas/*.ts                           🆕 one zod schema per agent output
agents/prompts/*.ts                           🆕 one prompt template per agent
profiles/investor-profiles.ts                 🆕 6 predefined investor archetypes (§12.3)
profiles/founder-profiles.ts                  🆕 6 predefined founder archetypes (§12.4)
```

---

## 5. API surface

| Method | Path | Purpose | Journey |
|---|---|---|---|
| `POST` | `/assets` | multipart PDF → validate → create `documents` + **ingestion** job (QUEUED) → start JOB A → `{assetId, ingestionJobId}` (does **not** run agents) | both |
| `GET` | `/assets?tenantId=` | list assets + latest `{ingest_status, recommendation_status, readiness_score, band, title}` | both |
| `GET` | `/assets/:id` | result object (§7) with `ingestion:{status,progress}` + `recommendation:{status,progress,current_step}` embedded — UI polls this | both |
| `POST` | `/assets/:id/recommend` | **starts JOB B** (requires asset ready); idempotent re-run creates a fresh recommendation job → `{recommendationJobId}` | both |
| `GET` | `/assets/:id/recommendation` | the recommendation block of the result object | both |
| `GET` | `/assets/:id/brief` | venture brief (`markdown_content` + structured `sections`) | both |
| `POST` | `/assets/:id/fit` | **investor/startup enters a profile → tailored fit** against this asset (§4.2, §6.9); synchronous; persisted to `fit_analyses` | investor |
| `GET` | `/assets/:id/agent-outputs` | debug: the `agent_outputs` audit trail for this asset (tokens/latency/cache per call) | dev |
| `POST` | `/retrieve` | debug retrieval (keep from `rag_agent`) | dev |

> **`POST /assets/:id/fit`** — body `{ profile: { kind: 'investor'|'founder'|'company', name?, domains[]?, preferred_stage?, preferred_business_model?, risk_tolerance?, skills[]?, … } }`. Requires a **completed recommendation** (needs `startup_opportunity` + readiness); else `409 "Run recommendation first."` Returns `{ match_score, breakdown (§12.5 rubric), match_reason, concerns[], recommended_next_steps[] }`. One LLM call → no job needed.
> **Trigger policy:** recommendation is started explicitly by `POST /recommend` (keeps the two jobs apart). For the researcher journey's "automatic" feel (§4.1), an env flag **`AUTO_RECOMMEND=true`** lets the ingestion runner enqueue a recommendation job on completion — still a *separate* job, just auto-kicked. Default `false`.

---

## 6. Agent pipeline design (JOB B core)

### 6.1 Fixed retrieval queries → context package (§7.5 / §14.2)
First step of JOB B. `ContextPackageService` runs these **9 fixed queries** (verbatim from §14.2), retrieves top-k per query, dedupes chunks by id, and groups them:
```
1 What is the main technical contribution of this research?
2 What problem does this research solve?
3 What methods does this research use?
4 What experiments, evaluations, or results are described?
5 What real-world applications are mentioned?
6 What limitations or future work are mentioned?
7 What industries or users could benefit from this?
8 What evidence suggests technical maturity?
9 What evidence suggests commercial relevance?
```
Output `ContextPackage = { metadata, retrievedByQuery: {query → chunks[]}, systemNotes }`.
`systemNotes` carries the §7.6 / §10.4 caveats: *"PDF only", "IP/patent status not assessed", "no external validation performed"*. This is the **evidence base** every agent is restricted to.

### 6.2 Shared agent rules (§8.3) — one system-prompt contract
`agents/shared-rules.ts` exports a system-prompt prefix injected into **every** agent call:
- Use **only** the uploaded PDF + retrieved context.
- Never invent patents, investors, or customers. Never claim external validation absent from the PDF.
- **Separate facts from assumptions**; mark missing information explicitly.
- Always return a **confidence score** and **structured output** (enforced by zod schema, §6.6).
- Be specific and practical (no vague multi-industry hedging — see Agent 3).

### 6.3 The five agents — exact I/O and output schemas
Sequential; each output feeds the next. Every schema includes `confidence` (0–100) and optional `missing_information[]`.

**Agent 1 — Research Understanding (§9)**
- *In:* ContextPackage (core-contribution, method, evaluation, limitation, application chunks) + metadata.
- *Out:* `technical_summary, plain_english_summary, core_innovation, research_domains[], methods_used[], possible_applications[], evidence_from_paper[], limitations[], confidence`.

**Agent 2 — Commercial Readiness (§10)**
- *In:* ctx + Agent 1.
- *Rubric* `score_breakdown` summing to 100: `technical_maturity(0–25), application_clarity(0–20), customer_clarity(0–15), evidence_strength(0–15), implementation_feasibility(0–10), market_urgency(0–10), research_to_product_gap(0–5)`.
- *Band* from score: `0–30 Research-only · 31–50 Needs exploration · 51–70 Commercially interesting · 71–85 Strong candidate · 86–100 Very strong candidate`.
- *Out:* `score, band, score_breakdown{…}, positive_signals[], negative_signals[], missing_information[], ip_note, confidence`.
- **Hard constraint (§10.4):** `ip_note` is always the literal *"IP status is not assessed in this MVP."* (validated by zod `.literal(...)` so it can never drift).

**Agent 3 — Startup Opportunity (§11)**
- *In:* ctx + Agents 1–2.
- *Out:* `title, one_liner, problem, solution, target_customer, buyer_persona, beachhead_market, business_model, why_now, first_product, required_team[], risks[], validation_steps[], confidence`.
- Prompt enforces the §11.1 **anti-vague rule** (good vs bad example baked in: one concrete opportunity, not a list of industries).

**Agent 4 — Investor / Founder Fit (§12)**
- *In:* Agent 3 + readiness + the **static profiles** (§6.4) injected into the prompt.
- *Match rubric* (0–100): `domain_fit(0–25), stage_fit(0–15), business_model_fit(0–15), technical_risk_fit(0–15), customer_access_fit(0–10), founder_skill_fit(0–10), risk_tolerance_fit(0–10)`.
- *Out:* `best_investor_matches[]{profile_name, match_score, match_reason, concerns}`, `best_founder_matches[]{profile_name, match_score, match_reason}`, `recommended_team[], concerns[], confidence`.

**Agent 5 — Venture Brief (§13)** — the final user-facing artifact.
- *In:* all of Agents 1–4.
- *Out (structured + rendered):* `title, one_liner, research_summary, commercial_opportunity, target_customer, problem, solution, business_model, commercial_readiness(score+band), why_now, risks[], validation_steps[], recommended_founder_team, recommended_investor_type, mvp_product_idea, missing_information[], ip_note` **plus `markdown_content`** (the assembled brief for direct display).

### 6.4 Predefined profiles (§12.3–12.4) — static seed data
Two TS constant arrays (not DB tables), passed into Agent 4's prompt. These are **archetypes, not real named firms** — which is how we honour the "don't invent investors" rule.
- **Investor profiles (6):** Climate Seed · AI Infrastructure · Health DeepTech · Industrial Automation · University Spinout · Corporate Innovation. Fields: `name, type, investment_interests[], preferred_stage, preferred_business_model, risk_tolerance, relevant_domains[]`.
- **Founder profiles (6):** Scientific Founder · DeepTech Engineer · B2B SaaS Operator · Industrial Sales Founder · Product/Growth Founder · Regulated-Market Operator. Fields: `name, skills[], preferred_domain, commercial_strength, technical_strength, availability_assumption`.

### 6.5 Metadata agent (§6.8, JOB A) vs Research Understanding (§9, JOB B) — reconciled
The **metadata agent runs in the ingestion job** (cheap; gives the asset-list its `title`/`abstract` early → `documents.metadata`). **Research Understanding (Agent 1, JOB B)** produces the richer, context-grounded version used downstream and surfaced in the result object's `metadata` block (it supersedes ingest metadata where they overlap; ingest metadata is the fallback before recommendation has run).

### 6.6 `LlmService` contract
```ts
generate<T>(opts: {
  system: string;          // shared-rules prefix + per-agent instructions
  user: string;            // context package + prior agent outputs
  schema: ZodSchema<T>;    // → JSON schema → forced single-tool call (Claude)
  cacheKey?: string;       // mark the shared context block as a cache breakpoint
  audit?: { agentName: string; documentId: string; jobId?: string };  // → one agent_outputs row
}): Promise<T>             // validated; retries the call on schema-validation failure
```
Deps: **`@anthropic-ai/sdk`** + **`zod-to-json-schema`**. `vertex-gemini.provider.ts` is a thin unimplemented stub for now.
When `audit` is set, `LlmService` calls `agent-output.recorder` to persist the call (model, output, latency, prompt/completion/cache-read tokens) — so every agent, metadata, and `/fit` call is traceable.

### 6.7 Why prompt caching matters here
All 5 recommendation agents share the **same** ContextPackage. With Claude prompt caching, that block is written once and re-read by agents 2–5 at a fraction of input-token cost — material savings across a 5-call recommendation job. Structure each prompt as `[shared rules + cached context package] + [per-agent instruction + prior outputs]`.

### 6.8 Orchestrator
`recommendation.orchestrator` runs Agents 1 → 2 → 3 → 4 → 5 (metadata is already done in JOB A), persisting each block, denormalizing `readiness_score`/`band`, and (via `recommendation.runner`) advancing `jobs.progress`/`current_step`. On any agent error: `jobs.status = FAILED` + `error`. On success: assemble the result object, `jobs.status = COMPLETED`. Optional: embed `markdown_content` → `venture_brief_embeddings` (§7.2).

### 6.9 On-demand fit (`POST /assets/:id/fit`, §4.2)
The investor-fit agent runs in a **second mode**, reusing the §12.5 rubric and the same prompt scaffolding but with a **user-supplied profile** instead of the 6 archetypes. `fit.service` loads the asset's stored `startup_opportunity` + `commercial_readiness`, builds a focused prompt (opportunity + readiness + the supplied profile), and makes **one** `LlmService.generate()` call (so it's synchronous — no job, no progress bar). The result is persisted to `fit_analyses` and returned. This powers the investor journey's "enter my profile → see fit" step without re-running the whole pipeline.

---

## 7. Result object (§15) — the stored/returned shape

The canonical read-model returned by `GET /assets/:id` and `/recommendation`, assembled from `documents` + the two latest `jobs` + `recommendations`:
```
{ research_asset: { id, title, filename, upload_time },
  ingestion:     { status, progress },                     // JOB A
  recommendation:{ status, progress, current_step },        // JOB B
  metadata: { abstract, technical_summary, plain_english_summary,
              domains, methods, possible_applications, detected_industries },
  commercial_readiness: { score, band, score_breakdown, positive_signals,
              negative_signals, missing_information, ip_note, confidence },
  startup_opportunity: { title, one_liner, problem, solution, target_customer,
              buyer_persona, beachhead_market, business_model, why_now,
              first_product, required_team, risks, validation_steps, confidence },
  investor_founder_fit: { best_investor_matches, best_founder_matches,
              recommended_team, concerns },
  venture_brief: { title, one_liner, markdown_content, sections } }
```
Note: §15 has no separate `research_understanding` key — its summary fields populate `metadata`; the richer Agent-1 output (core_innovation, evidence, limitations) is stored in `recommendations.research_understanding` and feeds downstream agents.

---

## 8. Job processing & progress (§16) — two independent bars

Two in-process job kinds, each `QUEUED → PROCESSING → COMPLETED | FAILED` with its own 0–100 progress. (Diverges from §16's single bar — by request the two are kept apart, so the §16.4 steps are split across two scales.)

**JOB A — ingestion**
| `current_step` | progress |
|---|---|
| Saving PDF | 10 |
| Extracting text | 30 |
| Cleaning text | 45 |
| Chunking document | 60 |
| Creating embeddings | 85 |
| Extracting metadata | 95 |
| Ready | 100 |

**JOB B — recommendation**
| `current_step` | progress |
|---|---|
| Retrieving context | 10 |
| Understanding research | 25 |
| Scoring readiness | 45 |
| Generating opportunity | 65 |
| Matching investor/founder | 80 |
| Generating venture brief | 95 |
| Completed | 100 |

---

## 9. Phased build plan (each phase ends green + manually verifiable)

| Phase | Deliverable | Verify |
|---|---|---|
| **0 — Baseline** | `npm i`; `docker compose up -d`; build passes; `/ingest` + `/retrieve` still work | upload a PDF, `/retrieve` returns chunks |
| **1 — Ingestion job** | new columns + `jobs` table + `assets.*` + `LocalStorageService`; validation (≤20MB, ≤50pp); scanned-PDF detection + exact message; `ingestion.runner` does JOB A async, advancing progress 10→100 | `POST /assets` → poll `GET /assets/:id` → `ingestion` reaches `ready` |
| **2 — LLM + metadata + audit** | `LlmService` (Claude) + `shared-rules` + `agent-output.recorder` (every call → `agent_outputs`) + `metadata.agent` → `documents.metadata` (inside JOB A) | `GET /assets/:id` shows title/abstract; `agent_outputs` row exists per call |
| **3 — Context package** | `context-package.service` (9 fixed queries + dedupe) — JOB B step 1 | inspect a built ContextPackage for a real PDF |
| **4 — Agents + recommendation job** | 5 agents + zod schemas + prompts + profiles seed + orchestrator + `recommendation.runner` persisting all blocks + rubrics + literal IP note | `POST /assets/:id/recommend` → `recommendations` row populated, JOB B COMPLETED |
| **5 — Result API + brief + fit** | result-object assembly on `GET /assets/:id` + `/brief` markdown; `POST /assets/:id/fit` (`fit.service` + `fit_analyses`); debug `GET /assets/:id/agent-outputs`; optional brief embedding | full brief end-to-end; `/fit` returns a tailored match for a supplied profile |
| **6 — Polish** | error paths → `FAILED`, idempotent re-run, optional `AUTO_RECOMMEND` chain, seed/test PDF, README, `.env.example` | re-run recommendation without re-ingesting; bad PDF shows friendly error |

**Hackathon order:** 0 → 1 → 2 → 4 (start with a 2-agent slice: understanding + brief) → 3 (richer context) → fill agents 2,3,4 + profiles → 5 → 6. Fastest path to a visible end-to-end brief, then deepen quality.

---

## 10. Design-doc gaps / inconsistencies (resolved)

1. **Job model:** "in-memory/file-based" vs "postgresDB" vs "Python worker" (§2.1/§5.2) → **two JS/TS in-process jobs**, Postgres for data + a `jobs` table tracking status/progress per kind (§3, §8).
2. **Ingestion vs recommendation kept apart (per request):** §14/§16 implied one continuous job; we split into two independent jobs. Recommendation is triggered by `POST /recommend` (optionally auto-chained via `AUTO_RECOMMEND`), so the §16 single progress bar becomes two (§8).
3. **`research_understanding` vs `metadata`:** §9 output overlaps §15 `metadata`, and §15 has no `research_understanding` key → reconciled in §6.5 / §7.
4. **PDF section/title/abstract:** pdfjs gives plain text, not reliable headings → handled by the **metadata LLM agent**, not regex; `chunks.section` often `null` (fine).
5. **IP note:** enforced as a **literal zod constant** so the §10.4 disclaimer can never drift or be omitted.
6. **"Don't invent investors" vs predefined investor profiles:** resolved — profiles are **archetypes**, never real named firms.
7. **Two journeys, one result object:** confirmed shared. The investor-specific feature is **`/fit`** (✔ in scope) — the investor-fit agent in on-demand mode (§6.9). **`agent_outputs`** audit table is ✔ in scope (written by `LlmService`).
8. **Auth/tenancy:** `tenantId` only, no auth (post-MVP). **Limits:** ≤20MB/≤50pp enforced Phase 1 (also bounds LLM cost).
9. **Brief embedding (§7.2):** optional, Phase 5, off the critical path.

---

## 11. Net assessment

- **Reused:** ingestion, chunking, embeddings, pgvector storage, retrieval, config, DB, Docker (~783 lines working).
- **To build:** `LlmService` + provider + `agent-output.recorder`, two job runners, asset lifecycle, context package, shared rules, 5 agents + schemas + prompts + 12 profiles + orchestrator, `fit.service` (`/fit`), result-object API, migrations. ~28 mostly-small files.
- **Critical path:** D4 → `LlmService` → orchestrator (JOB B). Ingestion (JOB A) is independent and can be built first.
- **No** Redis/Celery/Temporal/Kafka/external-queue/scraping — consistent with the doc's exclusions.
```
