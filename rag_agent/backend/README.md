# Lab2Venture AI — Backend

Turns a manually uploaded research PDF into a structured startup/investor recommendation brief.
Built on the existing NestJS + Postgres/pgvector + Vertex embeddings stack; generation runs on Claude.

Ingestion and recommendation are **two separate jobs** (kept apart on purpose): an asset is ingested
(parsed → chunked → embedded → metadata) and becomes `ready`; a recommendation is then run on demand.

## Architecture

```
POST /assets ──► JOB A (ingestion): save → parse → chunk → embed → metadata ──► ready
                                                                                  │
POST /assets/:id/recommend ──► JOB B (recommendation):                            ▼
   context package (9 fixed queries) → research-understanding → commercial-readiness
   → startup-opportunity → investor-fit → venture-brief → store ──► completed
```

Both jobs are tracked in the `jobs` table with `status` (QUEUED/PROCESSING/COMPLETED/FAILED),
`progress` (0–100), and `current_step`, which the UI polls via `GET /assets/:id`.

## Setup

```bash
# 1. Postgres + pgvector
docker compose up -d            # from the repo root

# 2. Env
cp .env.example .env
#   - GCP_PROJECT_ID + ADC (gcloud auth application-default login) with Vertex AI enabled
#   - ANTHROPIC_API_KEY for generation

# 3. Install + run (migrations run automatically on boot)
npm install
npm run start:dev
```

### Credentials
- **Vertex AI** (embeddings) — required for ingestion and retrieval. Needs the Vertex AI API
  enabled on `GCP_PROJECT_ID` and ADC with `roles/aiplatform.user`.
- **ANTHROPIC_API_KEY** (generation) — required for the recommendation agents and `/fit`.
  Ingestion still completes without it (metadata extraction is best-effort).

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/assets` | Upload a PDF (multipart `file`, optional `tenantId`) → starts ingestion → `{assetId, ingestionJobId}` |
| `GET` | `/assets?tenantId=` | List assets with latest ingestion/recommendation status + readiness |
| `GET` | `/assets/:id` | Result object (research_asset, ingestion, recommendation, metadata, all blocks) |
| `GET` | `/assets/:id/recommendation` | Alias of the result object |
| `GET` | `/assets/:id/brief` | Venture brief (markdown + sections) |
| `GET` | `/assets/:id/agent-outputs` | Audit trail (per-LLM-call tokens/latency/cache) |
| `POST` | `/assets/:id/recommend` | Start the recommendation job (requires `ready`; re-runnable) |
| `POST` | `/assets/:id/fit` | On-demand fit for a supplied profile: `{ "profile": { ... } }` |
| `POST` | `/retrieve` | (dev) raw semantic retrieval |

### Quick start
```bash
# upload
curl -F "file=@paper.pdf;type=application/pdf" -F "tenantId=demo" localhost:3000/assets
# poll status
curl localhost:3000/assets/<id>
# once ready, recommend
curl -X POST localhost:3000/assets/<id>/recommend
# read the brief
curl localhost:3000/assets/<id>/brief
# investor fit
curl -X POST -H 'content-type: application/json' \
  -d '{"profile":{"kind":"investor","name":"My fund","domains":["Energy"],"preferred_stage":"seed"}}' \
  localhost:3000/assets/<id>/fit
```

## Key modules
- `assets/` — upload + read endpoints, result-object assembly
- `pipeline/` — the two job runners + recommendation/fit triggers
- `agents/` — metadata + 5 recommendation agents, schemas, prompts, orchestrator, fit service
- `llm/` — provider-agnostic `LlmService` (Claude, structured output via tool-use + prompt caching)
- `rag/` — PDF parsing, chunking, Vertex embeddings, retrieval, context-package builder
- `profiles/` — predefined investor/founder archetypes (doc §12.3–12.4)
- `observability/` — `agent_outputs` audit recorder

See `../IMPLEMENTATION_PLAN.md` for the full design and how it maps to the source.
