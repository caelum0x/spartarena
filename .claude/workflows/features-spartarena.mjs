export const meta = {
  name: 'features-spartarena',
  description: 'Build new product features on top of AgentStaking + Byreal: SDK staking client, ByrealPoolAnalysis agent, API staking/byreal/feed endpoints, web staking UI + byreal section + arena search + live chronicle',
  phases: [
    { title: 'Features', detail: 'sdk, agent-runner, api, web (parallel)' },
    { title: 'Verify', detail: 'typecheck/build each touched package' },
  ],
}

const ROOT = '/Users/arhansubasi/spartarena'

const STAKING = `NEW CONTRACT — AgentStaking (ABI at ${ROOT}/packages/contracts/abi/AgentStaking.json, deployment key "AgentStaking", env NEXT_PUBLIC_AGENT_STAKING_ADDRESS):
- stake(uint256 agentId) payable — agent owner posts/top-ups an MNT bond
- unstake(uint256 agentId, uint256 amount) — owner withdraws bond
- slash(uint256 agentId, uint256 amount, string reason) — authorized writer only (Oracle Judge)
- bondOf(uint256 agentId) view returns (uint256); totalBonded() view; minBond() view; treasury() view; isActive(uint256 agentId) view returns (bool)
- events: Staked(agentId,owner,amount,newBond), Unstaked(agentId,owner,amount,newBond), Slashed(agentId,amount,newBond,reason)
Brand: a bond = the Spartan's "war chest"; staking signals commitment; slashing is dishonor. Surface bond on the agent profile + Hall of Glory.`

const BYREAL = `Byreal adapter (packages/byreal-adapter, already real): createByrealAdapter() returns ByrealSkillAdapter { analyzePool(input), discoverToken(input), previewSwap(input), managePosition(input) }, real REST against api2.byreal.io, each result carries toolProofHash + recordedOnMantle. Byreal is a Solana DEX — reads/quotes only.`

const CTX = `READ FIRST: ${ROOT}/.claude/build-context.md, ${ROOT}/.claude/production-context.md. Production project — real code, real connections, strict TS, zod validation, error handling, no \`any\`, no hardcoded secrets. Work ONLY in your assigned directory (read others freely). Update .env.example for any new env vars. Make your package typecheck/build. Return a concise summary.\n\n${STAKING}\n\n${BYREAL}`

const VERDICT = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, summary: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, errorsTail: { type: 'string' } },
  required: ['ok', 'summary'],
  additionalProperties: true,
}

phase('Features')

const results = await parallel([
  () => agent(`${CTX}

YOUR SCOPE: \`packages/sdk\`. Add staking support to the SDK.
- Add AgentStaking ABI to src/abis.ts (the functions/events above).
- Extend addresses loader/type with agentStaking (deployment key "AgentStaking" / env NEXT_PUBLIC_AGENT_STAKING_ADDRESS).
- Extend SpartArenaClient with: read getBond(agentId), getTotalBonded(), getMinBond(), isAgentActive(agentId); write stake(agentId, valueWei) (payable), unstake(agentId, amount), slash(agentId, amount, reason). Add a src/staking.ts helper module the client composes (mirror agents.ts/tasks.ts).
- Rebuild dist (pnpm --filter @spartarena/sdk build must pass and emit dist).`,
    { label: 'feat:sdk', phase: 'Features', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/agent-runner\`. Add a THIRD real agent: ByrealPoolAnalysisAgent.
- Add the decision type to src/schemas.ts: ByrealPoolAnalysisOutput { agentName:"ByrealPoolAnalyst"; taskId; decisionType:"BYREAL_POOL_ANALYSIS"; summary; pools:[{poolAddress,pair,tvl,apr,volume24h,reason}]; topPick:{poolAddress,reason}; confidence; riskScore; humanExplanation } with a matching LLM-decision schema (the LLM authors summary/topPick reasoning/humanExplanation; the agent fills deterministic numbers from the adapter). Add to AgentOutput union.
- Add src/agents/ByrealPoolAnalysisAgent.ts conforming to BaseAgent: it calls the real Byreal adapter (import { createByrealAdapter } from "@spartarena/byreal-adapter") analyzePool/pools, records ToolCalls (with toolProofHash), derives risk/confidence deterministically, and uses completeJsonOrFallback for the LLM-authored fields. Add a prompt file src/prompts/byreal-pool-analyst.system.ts.
- Wire it into src/demo.ts as a third section (keep the two existing agents intact), gated so it runs offline with BYREAL_MOCK=true and the mock LLM. Add @spartarena/byreal-adapter as a workspace dependency.
- Ensure the verifier scoreOutput handles the new output shape. pnpm --filter @spartarena/agent-runner typecheck must pass and the offline demo (LLM_PROVIDER=mock MANTLE_OFFLINE=true ASSETS_OFFLINE=true BYREAL_MOCK=true) must run all three agents.`,
    { label: 'feat:agent', phase: 'Features', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/api\`. Add real features:
1. Staking module (src/modules/staking/): GET /agents/:id/staking (reads bondOf/isActive via viem from AgentStaking), GET /staking/overview (totalBonded, minBond), and index Staked/Unstaked/Slashed events in the indexer (persist to a Stake/StakeEvent table — add to prisma schema + a migration note) so the leaderboard can weight by bond. Expose the agent's bond on the existing GET /agents/:id and GET /leaderboard responses (add bond + isActive fields).
2. Byreal module (src/modules/byreal/): GET /byreal/pools (proxy the real adapter analyzePool/pool list) and POST /tasks/:id/execute support for a "byreal" agent type that runs the ByrealPoolAnalysis path (or a POST /demo/run-byreal-agent). Use createByrealAdapter from @spartarena/byreal-adapter (add as dep).
3. Live feed: add GET /chronicle/stream as a Server-Sent Events (SSE) endpoint that emits new DecisionRecorded events as they are indexed (poll the DB cursor / decisions table and push). Keep it resilient.
Keep the { success,data,error,meta } envelope (SSE excepted), zod-validate inputs, no live calls in unit paths. Update .env.example (NEXT_PUBLIC_AGENT_STAKING_ADDRESS / AGENT_STAKING_ADDRESS, BYREAL_API_URL). pnpm --filter @spartarena/api typecheck must pass (run prisma generate after editing schema).`,
    { label: 'feat:api', phase: 'Features', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/web\`. Add real UI features (Next.js App Router, wagmi v2/viem, framer-motion, Spartan theme):
1. Staking on the agent profile (src/app/agents/[agentId]): a "War Chest" panel showing the agent's bond (bondOf) + active badge (isActive), with Stake / Unstake actions that send real wagmi txs to AgentStaking (stake payable, unstake). Add a useStaking hook + a StakePanel component + SkillBadge-style WarChestStat. Read AgentStaking address from NEXT_PUBLIC_AGENT_STAKING_ADDRESS, ABI from @spartarena/sdk or packages/contracts/abi.
2. Show bond on the Hall of Glory leaderboard (a "War Chest" column) and sort option.
3. Byreal section: a new route src/app/byreal/page.tsx (and nav link) that lists real Byreal pools (via the backend GET /byreal/pools, fallback gated by NEXT_PUBLIC_USE_MOCKS) with the ByrealPoolAnalyst decision proof hash shown.
4. Arena search + filter: add a search box + status filter + reward sort to src/app/arena (client-side over fetched battles).
5. Live War Chronicle: make src/app/chronicle subscribe to the backend SSE GET /chronicle/stream (EventSource) and prepend new decisions live, with a graceful fallback to polling.
Add 'use client' where needed, NEXT_PUBLIC_AGENT_STAKING_ADDRESS + NEXT_PUBLIC_API_URL to .env.example. \`pnpm --filter @spartarena/web typecheck\` AND \`pnpm --filter @spartarena/web build\` must pass.`,
    { label: 'feat:web', phase: 'Features', schema: VERDICT }),
])

const ok = results.filter(Boolean)
for (const r of ok) log(`${r.ok ? '✓' : '✗'} ${r.summary?.slice(0, 130) ?? ''}`)

phase('Verify')
const checks = [
  { name: 'sdk', cmd: 'pnpm --filter @spartarena/sdk build' },
  { name: 'agent-runner', cmd: 'pnpm --filter @spartarena/agent-runner typecheck' },
  { name: 'api', cmd: 'pnpm --filter @spartarena/api typecheck' },
  { name: 'web', cmd: 'pnpm --filter @spartarena/web typecheck' },
]
const verify = await parallel(checks.map((c) => () =>
  agent(`Run \`cd ${ROOT} && ${c.cmd}\` (run pnpm install --frozen-lockfile=false first if needed). Report ok=true only if exit 0, else last ~60 lines in errorsTail. Don't fix anything.`,
    { label: `verify:${c.name}`, phase: 'Verify', schema: VERDICT }).then((v) => ({ name: c.name, ...v }))))

return { features: ok.map((r) => ({ ok: r.ok })), verify: verify.filter(Boolean).map((v) => ({ name: v.name, ok: v.ok })) }
