# SpartArena — Agent Design

The agent runner (`apps/agent-runner`) builds two production agents on a shared, auditable harness. Heavy reasoning lives in the LLM; deterministic, security-relevant fields (scores, evidence linkage, hashing) are owned by the agent code so the on-chain proof is reproducible.

## The harness

```txt
BaseAgent
   ├─ tools/      Mantle reader · asset data · Byreal adapter · risk scorer
   ├─ llm/        provider abstraction: mock · openai · anthropic (+ http, json)
   ├─ schemas.ts  strict zod I/O contracts
   ├─ verifier.ts scores accuracy / safety / speed / user
   ├─ hash.ts     keccak256(JSON.stringify(...)) of prompt / output / tools
   └─ chain/      ChainWriter (viem) → DecisionLedger / TaskEscrow / ReputationEngine
```

`AgentRun` carries the structured `output`, the `toolCalls` made, and timing — everything the verifier and the hasher need.

## Execution loop

```txt
1. Receive task context (taskId, target, query, risk mode)
2. Run tools  → collect evidence + raw data
3. Call LLM   → produce the narrow qualitative JSON (summary, reasoning, action, explanation)
4. Assemble   → merge LLM judgement with deterministic fields (confidence, riskScore, evidence)
5. Validate   → zod-parse the full output; reject anything off-schema
6. Hash       → promptHash, outputHash, toolsHash
7. Score      → verifier assigns accuracy/safety/speed/user
8. Settle     → DecisionLedger.recordDecision → TaskEscrow.submitResult → ReputationEngine.submitScore
```

The LLM produces only a **narrow** decision object (see `AlphaLlmDecisionSchema` / `YieldLlmDecisionSchema`) — prose and per-item reasoning. The agent owns the numbers: `confidence`, `riskScore`, evidence linkage, and asset weights are computed deterministically from the **real** data, then the model's recommended action is cross-checked against the deterministic action. This is the **LLM-authored-decision + deterministic-cross-check** design: a hallucinated action cannot silently drive an on-chain write, and the same input always yields the same hash.

## Hashing rule

The single canonical rule, shared by the agent runner, API, and web app (`hash.ts` / `@spartarena/shared`), is **keccak256 of the UTF-8 bytes of `JSON.stringify(value)`**:

```ts
const promptHash = keccak256(toBytes(JSON.stringify(prompt)));     // { system, user }
const outputHash = keccak256(toBytes(JSON.stringify(output)));     // the validated agent output
const toolsHash  = keccak256(toBytes(JSON.stringify(toolCalls)));  // the recorded tool calls
```

Because the rule is identical everywhere, any party can recompute the three hashes from the off-chain payloads and confirm they match the on-chain `Decision`. That is the entire verification model.

## Agent 1 — AlphaSentinel

Detects unusual or important on-chain activity from **real** data.

**Inputs:** `taskId`, `targetWallet`, `query`, `riskMode` (`conservative`/`balanced`/`aggressive`).

**Tools (real):** the `MantleReader` pulls native balance via viem `getBalance` and recent ERC-20 transfer history via the Etherscan-V2 client (`https://api.etherscan.io/v2/api?chainid=5003`, one key, all chains, 5 req/s with backoff), plus an explorer link builder. It computes a baseline (median of recent transfer values) and flags outliers — `maxOverMedian`, `outlierCount`, `transfersToNewContracts` — with no hardcoded transfers.

**Deterministic scoring:** `riskScore` is derived from the real anomaly signals (`min(60, maxOverMedian·6) + outlierCount·12 + transfersToNewContracts·15 + 14`, clamped 0–100); `confidence` grows with the count of real evidence; the deterministic action follows risk thresholds (≥75 escalate, ≥50 alert, ≥25 watchlist, else ignore). The final `recommendedAction` is the **more severe** of the LLM's action and the deterministic one. Each evidence row links a real tx hash to an explorer URL.

**Output schema** (`AlphaSentinelOutputSchema`):

```ts
{
  agentName: "AlphaSentinel";
  taskId: number;
  decisionType: "ALPHA_ALERT";
  summary: string;
  evidence: { type: "transaction"|"wallet"|"token"|"contract"; value: string; reason: string; explorerUrl?: string }[];
  confidence: number;        // 0–100
  riskScore: number;         // 0–100
  recommendedAction: "ignore" | "watchlist" | "alert" | "escalate";
  humanExplanation: string;
}
```

Sample: [`demo/sample-alpha-output.json`](../demo/sample-alpha-output.json).

## Agent 2 — YieldStrategist

Produces conservative strategy suggestions over real Mantle-ecosystem asset data. **Does not move real capital in the MVP** — it produces strategy, proof, and scoring only.

**Inputs:** `taskId`, `assets` (default `MNT`/`mETH`/`USDY`), `goal`, `riskProfile`.

**Tools (real):** the `AssetDataTool` fetches USD prices + 24h change from **CoinGecko** (`api/v3/simple/price`) and Mantle pool APYs from **DefiLlama** (`yields.llama.fi/pools`, plus named pool UUIDs for USDY/mETH), all zod-validated. Volatility is proxied from |24h change| × a per-asset factor.

**Deterministic allocation:** weights come from **inverse-volatility** weighting (lower-volatility assets get more), with a 70% single-asset concentration ceiling that redistributes overflow across the remaining assets. `riskScore` scales the weighted portfolio volatility plus a per-warning penalty; `confidence` is high when data is complete and warnings are few. Policy warnings (high volatility, thin liquidity, de-peg risk, over-concentration) are built deterministically and merged with any the LLM surfaces — the deterministic ones are always kept.

**Output schema** (`YieldStrategistOutputSchema`):

```ts
{
  agentName: "YieldStrategist";
  taskId: number;
  decisionType: "RWA_STRATEGY";
  strategySummary: string;
  assets: { symbol: string; suggestedWeight: number; reason: string }[];  // weights 0–100
  confidence: number;        // 0–100
  riskScore: number;         // 0–100
  policyWarnings: string[];
  humanExplanation: string;
}
```

Sample: [`demo/sample-yield-output.json`](../demo/sample-yield-output.json).

## LLM providers

The provider abstraction (`llm/provider.ts`) is **real-by-default**. `getProvider()` selects:

1. `ANTHROPIC_API_KEY` set → **Anthropic** Messages API (`/v1/messages`, default model `claude-opus-4-8`).
2. else `OPENAI_API_KEY` set → **OpenAI** Chat Completions (`/v1/chat/completions`, default `gpt-4o`, JSON mode).
3. else `LLM_PROVIDER=mock` → deterministic mock (offline/tests only).
4. else → a clear configuration error.

Real providers use `completeJson(system, user, schema)`: instruct the model to return ONLY JSON, parse, zod-validate, and retry once with a "return valid JSON only" nudge on failure (native fetch + AbortController timeout). The mock cannot synthesise arbitrary JSON, so each agent passes a deterministic fallback via `completeJsonOrFallback` — this lets `make agent-demo` exercise the full pipeline (real reads → hashing → scoring → optional chain writes) offline with no LLM key, while the production path stays LLM-driven.

## Verifier — Oracle Judge

`verifier.ts` (`scoreOutput`) scores a completed run on four 0–100 dimensions, deterministically, so a score can be re-derived and audited:

- **accuracy** — rewards evidence richness: `50 + evidenceCount·20 + round(confidence/10)`.
- **safety** — rewards calibrated (not reckless) risk handling: `100 − |riskScore − 60|`.
- **speed** — full marks under 2s, decaying after: `100 − max(0, round((elapsedMs − 2000)/100))`.
- **userRating** — a fixed proxy (`80`) for the MVP.

All four are clamped to 0–100 and feed `ReputationEngine.submitScore`, which applies the on-chain weights (accuracy 40 · safety 30 · speed 15 · user 15). A real verifier would re-run the tools and compare; the MVP scores structural quality so the harness is end-to-end and reproducible.

## Why this is trustworthy

Anyone can take the agent's off-chain prompt, output, and tool calls, recompute the three keccak256 hashes, and confirm they match the on-chain `Decision`. Combined with strict zod validation and deterministic scoring, this makes each agent's claim independently checkable — which is the whole point of SpartArena.

## Running it

```bash
make agent-demo            # offline: full pipeline, no chain writes
make agent-demo-onchain    # writes proofs to deployed contracts
```
