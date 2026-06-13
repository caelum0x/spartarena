export const meta = {
  name: 'productionize-spartarena',
  description: 'Replace every mock/placeholder with real API connections (LLM, Mantle RPC/explorer, market data, Byreal, notifications, DB) across agent-runner, byreal-adapter, api, web',
  phases: [
    { title: 'Productionize', detail: 'one agent per directory wires real connections (parallel)' },
    { title: 'Verify', detail: 'typecheck each touched package' },
  ],
}

const ROOT = '/Users/arhansubasi/spartarena'
const CTX = `READ FIRST: ${ROOT}/.claude/production-context.md (VERIFIED real API facts) and ${ROOT}/.claude/build-context.md (architecture/brand/contract surface). This is a PRODUCTION project — replace mocks with REAL connections. Default code path must hit real APIs; mocks only behind explicit env flags. Validate all external JSON with zod, add timeouts/retries/rate-limit handling, no hardcoded secrets, no \`any\`. Work ONLY in your assigned directory (you may read others). Update your package's .env.example. Make it typecheck. Return a concise summary of what you wired and any required env vars.`

const VERDICT = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, summary: { type: 'string' }, envVars: { type: 'array', items: { type: 'string' } }, errorsTail: { type: 'string' } },
  required: ['ok', 'summary'],
  additionalProperties: true,
}

phase('Productionize')

const results = await parallel([
  () => agent(`${CTX}

YOUR SCOPE: \`apps/agent-runner\` — make the agents run on REAL data + REAL LLMs.
1. LLM: create src/llm/anthropic.ts (real Anthropic Messages API) and src/llm/openai.ts (real OpenAI Chat Completions, response_format json_object). Extend the LlmProvider interface with completeJson<T>(system,user,zodSchema) that calls the API, extracts text, JSON.parses, zod-validates, retries once on failure. getProvider(): ANTHROPIC_API_KEY→anthropic, else OPENAI_API_KEY→openai, else LLM_PROVIDER=mock→mock, else throw clear error. Use native fetch + AbortController timeout.
2. Mantle tools (src/tools/mantle.ts): REPLACE hardcoded transfer data with real reads — viem getBalance + Etherscan-V2 tokentx (action=tokentx, env ETHERSCAN_API_KEY) to fetch real recent ERC-20 transfers; also support viem getLogs Transfer scanning (chunked ~2000 blocks, backoff). Compute real anomaly signals (transfer value vs median, transfers to newly-created contracts via getCode). Record real ToolCalls. Provide a graceful offline path ONLY when no RPC/key AND MANTLE_OFFLINE=true.
3. Assets tool (src/tools/assets.ts): REPLACE mock asset data with real CoinGecko /simple/price + DefiLlama /pools (filter chain==="Mantle") + coins.llama.fi prices, per production-context. Real APY for USDY/mETH from the named DefiLlama pools.
4. Have AlphaSentinelAgent + YieldStrategistAgent use the LLM to produce the structured decision (summary/evidence-reasoning/recommendedAction or strategy/assets/policyWarnings) from the REAL evidence via completeJson + zod, keeping deterministic risk/confidence as cross-check. Keep humanExplanation real.
5. Update .env.example + README with all new env vars.
Verify: cd ${ROOT}/apps/agent-runner && pnpm install --frozen-lockfile=false && pnpm typecheck (and if ANTHROPIC/OPENAI keys are absent, a run with LLM_PROVIDER=mock MANTLE_OFFLINE=true must still execute). Report ok + envVars.`,
    { label: 'prod:agent-runner', phase: 'Productionize', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`packages/byreal-adapter\` — implement a REAL Byreal REST client (Byreal is a Solana DEX; reads/quotes only).
- Add src/rest.ts: ByrealRestClient hitting BYREAL_API_URL (default https://api2.byreal.io): pools list (GET /byreal/api/dex/v2/pools/info/list), pool details, token list (GET /byreal/api/dex/v2/mint/list), mint price (/mint/price), and swap quote (POST /byreal/api/router/v1/router-service/swap WITHOUT userPublicKey → preview). Use native fetch, timeouts, zod-validate responses (money fields are STRINGS — parse carefully).
- Make createByrealAdapter() return the REAL client by default; MockByrealAdapter only when BYREAL_MOCK=true. Keep the ByrealSkillAdapter interface; map analyzePool→pools, discoverToken→mint/list, previewSwap→router swap quote, managePosition→read position list (GET /position/list) or clearly mark mutation as Solana-side out-of-scope.
- Each result keeps a real toolProofHash (keccak256 of the real response via viem) + recordedOnMantle flag.
- Update README (note Solana reality + npm @byreal-io/byreal-cli + CLMM SDK for LP execution) and add .env.example (BYREAL_API_URL, BYREAL_MOCK).
Verify: cd ${ROOT} && pnpm --filter @spartarena/byreal-adapter build. Report ok + envVars.`,
    { label: 'prod:byreal', phase: 'Productionize', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/api\` — make the backend use REAL connections only.
- Remove any mock/simulated data paths. Real PrismaClient against DATABASE_URL.
- Real chain layer: viem public client (Mantle RPC by chainId) for reads; wallet client from BACKEND_SIGNER_PRIVATE_KEY for writes (recordDecision/submitResult/verifyTask/submitScore/recordEarnings). Use @spartarena/sdk where possible.
- Real indexer: poll real contract logs via getLogs from a persisted cursor block (Event/cursor table), upsert Agent/Task/Decision/ReputationScore rows. No fabricated events. Chunk + backoff.
- Real execution module: when a task is executed, invoke the REAL agent pipeline (call into @spartarena/agent-runner agents, or replicate: real Mantle/market reads + real LLM via env), hash, write on-chain with the signer, persist.
- Real notifications: Telegram sendMessage + Discord webhook (no-op with warn log if env unset).
- Real reputation scorer reads on-chain reputation + DB.
- Keep the { success, data, error, meta } envelope, zod-validate all inputs. Update .env.example with ANTHROPIC_API_KEY/OPENAI_API_KEY/ETHERSCAN_API_KEY/COINGECKO_API_KEY/TELEGRAM_*/DISCORD_WEBHOOK_URL/RPC/addresses/signer.
Verify: cd ${ROOT} && pnpm --filter @spartarena/api typecheck (run prisma generate first if needed; if prisma binary unavailable, keep types valid and note it). Report ok + envVars + any TODO that genuinely needs external infra (e.g. a running Postgres).`,
    { label: 'prod:api', phase: 'Productionize', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/web\` — make REAL backend + REAL on-chain the default; demote mocks to an explicit dev flag.
- src/lib/api.ts: call the real backend at NEXT_PUBLIC_API_URL with the { success,data,error,meta } envelope, proper error handling + react-query. Only fall back to src/lib/mock.ts when NEXT_PUBLIC_USE_MOCKS==='true' (NOT by default). When the API is genuinely unreachable, surface a real error/empty state — do not silently serve fake data unless the flag is on.
- On-chain reads/writes via wagmi/viem using NEXT_PUBLIC_*_ADDRESS + the SDK/ABIs. Register agent, create battle, release payment go through real wallet txs. Read agents/tasks/decisions/reputation from chain or the API.
- Wire CoinGecko-driven token prices where the UI shows asset values (via the backend, not client-side keys).
- Keep the polished Spartan UI + /demo route. Ensure 'use client' where hooks/wagmi used. Update .env.example (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_USE_MOCKS=false, NEXT_PUBLIC_* addresses, NEXT_PUBLIC_CHAIN_ID, RPC, explorer, WalletConnect projectId if used).
Verify: cd ${ROOT} && pnpm --filter @spartarena/web typecheck. Report ok + envVars.`,
    { label: 'prod:web', phase: 'Productionize', schema: VERDICT }),
])

const ok = results.filter(Boolean)
for (const r of ok) log(`${r.ok ? '✓' : '✗'} ${r.summary?.slice(0, 140) ?? ''}`)

phase('Verify')
const checks = [
  { name: 'byreal-adapter', cmd: 'pnpm --filter @spartarena/byreal-adapter build' },
  { name: 'agent-runner', cmd: 'pnpm --filter @spartarena/agent-runner typecheck' },
  { name: 'api', cmd: 'pnpm --filter @spartarena/api typecheck' },
  { name: 'web', cmd: 'pnpm --filter @spartarena/web typecheck' },
]
const verify = await parallel(checks.map((c) => () =>
  agent(`Run \`cd ${ROOT} && ${c.cmd}\` (run \`pnpm install --frozen-lockfile=false\` first if needed; esbuild build is allowed). Report ok=true only if it exits 0, else put the last ~60 lines in errorsTail. Do not fix anything.`,
    { label: `verify:${c.name}`, phase: 'Verify', schema: VERDICT }).then((v) => ({ name: c.name, ...v }))))

return {
  productionized: ok.map((r) => ({ ok: r.ok, env: r.envVars })),
  verify: verify.filter(Boolean).map((v) => ({ name: v.name, ok: v.ok })),
}
