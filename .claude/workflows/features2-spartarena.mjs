export const meta = {
  name: 'features2-spartarena',
  description: 'Queued features: ByrealPoolAnalysis agent, API byreal+SSE+leaderboard-bond, web Byreal page+live chronicle+leaderboard bond column',
  phases: [
    { title: 'Features', detail: 'agent-runner, api, web (parallel)' },
    { title: 'Verify', detail: 'typecheck/build each touched package' },
  ],
}

const ROOT = '/Users/arhansubasi/spartarena'

const FOUNDATION = `Already done (consume, do not rebuild): AgentStaking contract + ABI (packages/contracts/abi/AgentStaking.json), SDK staking methods (getBond/isAgentActive/getStakingOverview/stake/unstake/slash, agentStakingAbi, address key "AgentStaking", env NEXT_PUBLIC_AGENT_STAKING_ADDRESS), API GET /agents/:id/staking + GET /staking/overview, web War Chest panel + arena search. Byreal adapter (packages/byreal-adapter) is REAL: createByrealAdapter() -> ByrealSkillAdapter { analyzePool, discoverToken, previewSwap, managePosition } against api2.byreal.io (Solana DEX; reads/quotes only), each result has toolProofHash + recordedOnMantle.`

const CTX = `READ FIRST: ${ROOT}/.claude/build-context.md, ${ROOT}/.claude/production-context.md. Production project: real code/connections, strict TS, zod validation, error handling, no \`any\`, no hardcoded secrets. Work ONLY in your assigned directory (read others freely). Update .env.example for new vars. Make your package typecheck/build. Return a concise summary.\n\n${FOUNDATION}`

const VERDICT = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, summary: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, errorsTail: { type: 'string' } },
  required: ['ok', 'summary'],
  additionalProperties: true,
}

phase('Features')

const results = await parallel([
  () => agent(`${CTX}

YOUR SCOPE: \`apps/agent-runner\` — add a THIRD real agent: ByrealPoolAnalysisAgent.
- In src/schemas.ts add ByrealPoolAnalysisOutput { agentName:"ByrealPoolAnalyst"; taskId; decisionType:"BYREAL_POOL_ANALYSIS"; summary; pools: { poolAddress; pair; tvl; apr; volume24h; reason }[]; topPick:{ poolAddress; reason }; confidence(0-100); riskScore(0-100); humanExplanation } with a zod schema, plus a ByrealLlmDecisionSchema (LLM authors summary/topPick.reason/humanExplanation; the agent fills deterministic pool numbers from the adapter). Add ByrealPoolAnalysisOutput to the AgentOutput union.
- Add src/agents/ByrealPoolAnalysisAgent.ts implementing BaseAgent: import { createByrealAdapter } from "@spartarena/byreal-adapter", call analyzePool/pools, record ToolCalls (carry toolProofHash), derive risk/confidence deterministically from tvl/apr/volume, use completeJsonOrFallback for the LLM fields. Add src/prompts/byreal-pool-analyst.system.ts.
- Add "@spartarena/byreal-adapter": "workspace:*" to apps/agent-runner/package.json deps.
- Ensure src/verifier.ts scoreOutput handles the new shape (evidenceCount = pools.length).
- Wire a 3rd section into src/demo.ts (keep the two existing agents intact) that runs offline with BYREAL_MOCK=true + mock LLM.
- Verify: cd ${ROOT} && pnpm install --frozen-lockfile=false && pnpm --filter @spartarena/agent-runner typecheck; then the offline run LLM_PROVIDER=mock MANTLE_OFFLINE=true ASSETS_OFFLINE=true BYREAL_MOCK=true node --import tsx src/demo.ts must run all three agents. Report ok.`,
    { label: 'feat2:agent', phase: 'Features', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/api\` — add three features:
1. Byreal module src/modules/byreal/: GET /byreal/pools (call createByrealAdapter().analyzePool or pools list, return normalized { poolAddress, pair, tvl, apr, volume24h }), GET /byreal/tokens (discoverToken/mint list). Add "@spartarena/byreal-adapter": "workspace:*" to apps/api/package.json. Zod-validate, { success,data,error,meta } envelope, graceful error.
2. Live feed: GET /chronicle/stream as Server-Sent Events — on an interval, query newly-indexed decisions (by id cursor) from the decisions repository and push each as an SSE 'data:' event; send a heartbeat comment every ~15s; clean up on close. Resilient to DB errors.
3. Leaderboard bond: extend the leaderboard response (reputation module) and GET /agents/:id to include bond (readBond) + isActive (readAgentActive) from chain (degrade to "0"/false when unavailable). Add an optional sort=bond option to the leaderboard query.
Register any new routes in server.ts. Verify: cd ${ROOT} && pnpm --filter @spartarena/api typecheck (run prisma generate if needed). Report ok + new env vars.`,
    { label: 'feat2:api', phase: 'Features', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/web\` — add three UI features (Next.js App Router, wagmi v2, framer-motion, Spartan theme; read backend at NEXT_PUBLIC_API_URL, mocks gated by NEXT_PUBLIC_USE_MOCKS):
1. Byreal page: src/app/byreal/page.tsx ('use client') listing real Byreal pools from backend GET /byreal/pools (pair, TVL, APR, 24h volume, top pick), with the ByrealPoolAnalyst decision-proof hash shown when present. Add a nav link to it in components/layout/Header. Add a useByrealPools hook + a PoolCard component.
2. Live War Chronicle: make src/app/chronicle subscribe to backend SSE GET /chronicle/stream via EventSource, prepending new decisions live with a subtle highlight; gracefully fall back to existing polling/fetch when EventSource errors or USE_MOCKS.
3. Leaderboard bond: add a "War Chest" (bond) column to the Hall of Glory table (components/leaderboard/HallOfGloryTable) showing bond MNT + active badge, with a sort toggle by bond.
Add 'use client' where hooks/EventSource used; NEXT_PUBLIC_API_URL already in env. Verify: cd ${ROOT} && pnpm --filter @spartarena/web typecheck AND pnpm --filter @spartarena/web build must pass. Report ok.`,
    { label: 'feat2:web', phase: 'Features', schema: VERDICT }),
])

const ok = results.filter(Boolean)
for (const r of ok) log(`${r.ok ? '✓' : '✗'} ${r.summary?.slice(0, 130) ?? ''}`)

phase('Verify')
const checks = [
  { name: 'agent-runner', cmd: 'pnpm --filter @spartarena/agent-runner typecheck' },
  { name: 'api', cmd: 'pnpm --filter @spartarena/api typecheck' },
  { name: 'web', cmd: 'pnpm --filter @spartarena/web build' },
]
const verify = await parallel(checks.map((c) => () =>
  agent(`Run \`cd ${ROOT} && ${c.cmd}\` (pnpm install --frozen-lockfile=false first if needed). Report ok=true only if exit 0, else last ~60 lines in errorsTail. Don't fix anything.`,
    { label: `verify:${c.name}`, phase: 'Verify', schema: VERDICT }).then((v) => ({ name: c.name, ...v }))))

return { features: ok.map((r) => ({ ok: r.ok })), verify: verify.filter(Boolean).map((v) => ({ name: v.name, ok: v.ok })) }
