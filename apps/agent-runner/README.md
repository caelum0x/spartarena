# @spartarena/agent-runner

Runs SpartArena **Spartans** (AI agents) on **REAL data and REAL LLMs**, hashes
their decisions into a verifiable proof, lets the **Oracle Judge** (verifier)
score them, and optionally settles the proof on **Mantle**.

The default code path hits real APIs: real LLM inference (Anthropic or OpenAI),
real Mantle on-chain reads (viem + Etherscan-V2), and real market/yield data
(CoinGecko + DefiLlama). A deterministic offline/mock path remains, but only
behind explicit opt-in flags (`LLM_PROVIDER=mock`, `MANTLE_OFFLINE=true`,
`ASSETS_OFFLINE=true`) for tests and key-free demos.

## LLM layer

The runner is provider-agnostic via [`LlmProvider`](src/llm/provider.ts), which
exposes `complete(system, user)` (free-form prose) and
`completeJson<T>(system, user, zodSchema)` (structured output: instructs the
model to return ONLY JSON, parses it, zod-validates it, and **retries once** with
a "valid JSON only" nudge on failure). All providers use native `fetch` with an
`AbortController` timeout — no SDK dependency.

- [`src/llm/anthropic.ts`](src/llm/anthropic.ts) — Anthropic Messages API
  (`POST /v1/messages`, `x-api-key`, `anthropic-version: 2023-06-01`).
- [`src/llm/openai.ts`](src/llm/openai.ts) — OpenAI Chat Completions
  (`response_format: { type: "json_object" }`); honours `OPENAI_BASE_URL` for
  OpenAI-compatible gateways.

**Selection** (`getProvider()`): `ANTHROPIC_API_KEY` → Anthropic, else
`OPENAI_API_KEY` → OpenAI, else `LLM_PROVIDER=mock` → mock, else a clear config
error. Both agents derive their qualitative decision (summary, per-evidence
reasoning, recommended action / strategy narrative, policy warnings, human
explanation) from real evidence via `completeJson` + zod, while
confidence/riskScore/weights stay **deterministic** as an auditable cross-check.

## Agents

### AlphaSentinel — on-chain alpha detection (`ALPHA_ALERT`)

Reads a wallet's **real** recent activity on Mantle (via the `MantleReader`
tool): native MNT balance via viem `getBalance`, recent ERC-20 transfers via
Etherscan-V2 `tokentx` (preferred) or viem `getLogs` Transfer scanning (chunked
~2000 blocks with backoff) as a fallback, and **real anomaly signals** — transfer
value vs. recent median (outlier detection) and transfers to deployed/contract
recipients via `getCode`. The LLM reasons over this evidence and emits a
validated `AlphaSentinelOutput`: a summary, traceable evidence (each linking to
the explorer), a calibrated `confidence` (0-100) and `riskScore` (0-100), and a
`recommendedAction` (`ignore` | `watchlist` | `alert` | `escalate`).
Risk/confidence are derived deterministically from the real signals (and
cross-checked against the LLM's action) so scoring is reproducible. The agent
never fabricates transactions — every claim traces to real tool output.

- Agent: [`src/agents/AlphaSentinelAgent.ts`](src/agents/AlphaSentinelAgent.ts)
- Tool: [`src/tools/mantle.ts`](src/tools/mantle.ts) (`MantleReader`)
- Prompt: [`src/prompts/alpha-sentinel.system.ts`](src/prompts/alpha-sentinel.system.ts)

### YieldStrategist — conservative RWA allocation (`RWA_STRATEGY`)

Fetches **real** conservative asset data for Mantle-ecosystem assets (`MNT`,
`mETH`, `USDY`) via the `AssetDataTool` — live USD price + 24h change from
CoinGecko `/simple/price` (the volatility proxy) and canonical APY from DefiLlama
`/pools` (USDY and mETH staking from the named pools) — derives an
**inverse-volatility** allocation
(lower-volatility assets get a larger share) with a **70% single-asset
concentration ceiling**, asks the LLM to narrate the rationale, and emits a
validated `YieldStrategistOutput`: a strategy summary, per-asset suggested
weights with reasons, `confidence`/`riskScore`, and explicit `policyWarnings`
(high volatility, thin liquidity, de-peg, concentration). It **never executes
real capital** — it only recommends (MVP).

- Agent: [`src/agents/YieldStrategistAgent.ts`](src/agents/YieldStrategistAgent.ts)
- Tool: [`src/tools/assets.ts`](src/tools/assets.ts) (`AssetDataTool`)
- Prompt: [`src/prompts/yield-strategist.system.ts`](src/prompts/yield-strategist.system.ts)

### Shared contract

Both agents implement [`BaseAgent<TInput, TOutput>`](src/agents/BaseAgent.ts) and
return an `AgentRun<T>`: `{ prompt, toolCalls, output }`. This uniform shape lets
the runner hash, score, and settle any agent's result through one code path.

## Pipeline

For every agent run the runner:

1. **Runs** the agent — builds the prompt, invokes tools (recorded as
   `ToolCall`s), calls the LLM, and validates the output with a Zod schema at the
   boundary ([`src/schemas.ts`](src/schemas.ts)).
2. **Hashes** the proof — `keccak256(JSON.stringify(...))` of the prompt, output,
   and tool calls ([`src/hash.ts`](src/hash.ts)). The same rule is used by the
   frontend/backend so all three derive identical hashes.
3. **Scores** with the Oracle Judge — structural accuracy / safety / speed /
   user rating ([`src/verifier.ts`](src/verifier.ts), prompt in
   [`src/prompts/verifier.system.ts`](src/prompts/verifier.system.ts)).
4. **Settles on-chain** (only with `--onchain`) — writes the decision, result
   hash, and reputation score to Mantle ([`src/chain/writer.ts`](src/chain/writer.ts)).

## Running

```bash
pnpm install
cp .env.example .env   # then fill in keys

# Default (REAL): real LLM + real Mantle reads + real market data, no chain writes.
# Requires ANTHROPIC_API_KEY or OPENAI_API_KEY, plus NEXT_PUBLIC_MANTLE_RPC_URL.
pnpm demo

# Offline/no-key demo: deterministic mock + offline data, full pipeline still runs.
LLM_PROVIDER=mock MANTLE_OFFLINE=true ASSETS_OFFLINE=true pnpm demo

# On-chain: also settles each proof to Mantle (requires the on-chain env vars).
pnpm demo:onchain

# Type-check
pnpm typecheck
```

### Offline vs `--onchain`

| Mode | Trigger | Behaviour |
| --- | --- | --- |
| **Real** (default) | no flag + keys set | Real LLM inference, real Mantle reads (balance/transfers/anomaly signals), real CoinGecko + DefiLlama data. Derives proof hashes and Oracle Judge scores. No chain writes. |
| **Offline** | `LLM_PROVIDER=mock MANTLE_OFFLINE=true ASSETS_OFFLINE=true` | Deterministic mock LLM + offline data. Full pipeline (hash + score) still runs with no API keys or RPC. For tests/demos only. |
| **On-chain** | `--onchain` | Everything the default mode does, **plus** `recordDecision`, `submitResult`, and `submitScore` transactions to the deployed Mantle contracts. Requires the on-chain env vars. |

## Environment variables

Loaded from `.env` via `dotenv`. See [`.env.example`](.env.example) for the full
list. For real (default) runs you need an LLM key **and** a Mantle RPC URL; the
offline flags below let the pipeline run with neither.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | one LLM key | — | Selects + authenticates the Anthropic Messages API (preferred when set). |
| `ANTHROPIC_MODEL` | no | `claude-opus-4-8` | Anthropic model id. |
| `ANTHROPIC_MAX_TOKENS` | no | `2048` | Max output tokens for Anthropic. |
| `OPENAI_API_KEY` | one LLM key | — | Selects + authenticates OpenAI Chat Completions (used when Anthropic key absent). |
| `OPENAI_MODEL` | no | `gpt-4o` | OpenAI model id. |
| `OPENAI_BASE_URL` | no | `https://api.openai.com/v1` | OpenAI-compatible base URL (Azure/OpenRouter/gateway). |
| `LLM_TEMPERATURE` | no | `0.2` | Sampling temperature for both providers. |
| `LLM_TIMEOUT_MS` | no | `60000` | Per-request LLM timeout (AbortController). |
| `LLM_PROVIDER` | offline only | — | Set to `mock` for the deterministic key-free provider. |
| `NEXT_PUBLIC_MANTLE_RPC_URL` | real reads / on-chain | `https://rpc.sepolia.mantle.xyz` (example) | Mantle RPC endpoint for `getBalance` / `getLogs` / `getCode`. |
| `ETHERSCAN_API_KEY` | no | — | Etherscan-V2 key (one key, all chains) for preferred `tokentx` transfer reads. Without it, falls back to viem `getLogs`. |
| `ETHERSCAN_TIMEOUT_MS` | no | `15000` | Etherscan request timeout. |
| `MANTLE_OFFLINE` | offline only | — | `true` enables a deterministic offline Mantle path (only when no RPC). |
| `COINGECKO_API_KEY` | no | — | Optional CoinGecko demo key (`x-cg-demo-api-key`) for higher rate limits. |
| `ASSETS_OFFLINE` | offline only | — | `true` enables deterministic offline asset snapshots. |
| `NEXT_PUBLIC_MANTLE_EXPLORER_URL` | no | `https://sepolia.mantlescan.xyz` | Base URL for explorer links. |
| `NEXT_PUBLIC_CHAIN_ID` | no | `5003` | Mantle chain id (5000 mainnet, 5003 Sepolia, 31337 anvil). |
| `BACKEND_SIGNER_PRIVATE_KEY` | on-chain | — | Verifier/writer wallet private key. **Never commit.** |
| `NEXT_PUBLIC_DECISION_LEDGER_ADDRESS` | on-chain | — | Deployed `DecisionLedger` address. |
| `NEXT_PUBLIC_TASK_ESCROW_ADDRESS` | on-chain | — | Deployed `TaskEscrow` address. |
| `NEXT_PUBLIC_REPUTATION_ENGINE_ADDRESS` | on-chain | — | Deployed `ReputationEngine` address. |
| `DEMO_TASK_ID` / `DEMO_AGENT_ID` | no | `1` / `1` | Ids used for the AlphaSentinel demo run. |
| `DEMO_YIELD_TASK_ID` / `DEMO_YIELD_AGENT_ID` | no | `2` / `2` | Ids used for the YieldStrategist demo run. |

> Secrets come from the environment only — never hardcode keys. The runner throws
> a clear error at startup if an `--onchain` env var is missing.

## Adding an agent

1. Define its output schema in [`src/schemas.ts`](src/schemas.ts) (Zod).
2. Add a system prompt under `src/prompts/`.
3. Implement `BaseAgent<TInput, TOutput>` under `src/agents/`, validating the
   output with the schema before returning the `AgentRun`.
4. Add a tool under `src/tools/` that records `ToolCall`s for the proof.
5. Wire a section into [`src/demo.ts`](src/demo.ts) reusing `proveScoreAndSettle`.
