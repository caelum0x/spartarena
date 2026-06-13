export const meta = {
  name: 'build-spartarena',
  description: 'Build the full SpartArena app (shared, sdk, byreal-adapter, api, web, docs) to production level with parallel subagents',
  phases: [
    { title: 'Packages', detail: 'shared, sdk, byreal-adapter, agent-runner extras (parallel)' },
    { title: 'Apps', detail: 'backend API + Next.js web (parallel)' },
    { title: 'Docs', detail: 'docs + root README' },
  ],
}

const ROOT = '/Users/arhansubasi/spartarena'
const CTX = `Read ${ROOT}/.claude/build-context.md FIRST for full shared context (chain config, contract surface, brand mapping, quality bar). Also read ${ROOT}/plan.md sections relevant to your scope. Work ONLY inside your assigned directory. Produce production-quality, strictly-typed code with error handling. Return a concise summary of files you created.`

phase('Packages')

const pkgResults = await parallel([
  () => agent(`${CTX}

YOUR SCOPE: \`packages/shared\` — the shared TypeScript library used by api, web and sdk.
Create:
- package.json (name "@spartarena/shared", type module, exports, build via tsc, deps: zod)
- tsconfig.json (strict, ESNext, declaration true, outDir dist)
- README.md
- src/index.ts (barrel re-exporting everything)
- src/constants.ts (APP_NAME, chain ids 5003/31337, RPC + explorer URLs, explorerTx/explorerAddress helpers)
- src/skillIds.ts (SKILLS array of {code, description}, and SKILL_IDS map code->keccak256 using viem's keccak256/toBytes)
- src/taskStatus.ts (TaskStatus enum mirroring contract order Open..Cancelled, label + color maps using brand)
- src/reputation.ts (Reputation type, weights, computeTotalScore helper)
- src/labels.ts (the full brand UI label map object)
- src/zod/agent.ts, src/zod/task.ts, src/zod/decision.ts (zod schemas + inferred types for Agent, Task, Decision, AlphaSentinelOutput, YieldStrategistOutput — mirror agent-runner/src/schemas.ts)
- src/utils/hash.ts (hashJson = keccak256(toBytes(JSON.stringify(x))) using viem), src/utils/format.ts (formatMnt, shortAddress, timeAgo), src/utils/explorer.ts
Add viem as a dependency. Ensure \`pnpm --filter @spartarena/shared build\` would typecheck (run tsc --noEmit if you can).`,
    { label: 'pkg:shared', phase: 'Packages' }),

  () => agent(`${CTX}

YOUR SCOPE: \`packages/byreal-adapter\` — a clean adapter exposing Byreal skills as a typed interface, with a mock implementation (live execution is out of scope for MVP).
Create:
- package.json (name "@spartarena/byreal-adapter", type module, deps: zod), tsconfig.json, README.md
- src/types.ts: PoolAnalysisInput/Result, TokenDiscoveryInput/Result, SwapPreviewInput/Result, PositionInput/Result with zod schemas
- src/index.ts: export interface ByrealSkillAdapter { analyzePool, discoverToken, previewSwap, managePosition } and a factory createByrealAdapter(opts) returning the mock by default
- src/mock.ts: MockByrealAdapter implementing the interface with realistic deterministic data, each result including a toolProofHash (keccak256 of the result via viem) and recordedOnMantle flag
- src/skills/analyzePool.ts, discoverToken.ts, previewSwap.ts, managePosition.ts (pure functions used by the mock)
Make it typecheck-clean. Add viem dep for hashing.`,
    { label: 'pkg:byreal', phase: 'Packages' }),

  () => agent(`${CTX}

YOUR SCOPE: \`packages/sdk\` — "@spartarena/sdk", a viem-based client SDK that wraps the SpartArena contracts for reads/writes. Depends on the contract ABIs at packages/contracts/abi/*.json (import via JSON or inline minimal ABIs) and "@spartarena/shared" (workspace:*).
Create:
- package.json, tsconfig.json, README.md
- src/chains.ts (mantleSepolia + localAnvil viem chain defs)
- src/addresses.ts (type for the deployment json + loader from env)
- src/abis.ts (typed ABIs for the functions/events the SDK needs — agentRegistry, taskEscrow, decisionLedger, reputationEngine, skillRegistry)
- src/types.ts
- src/SpartArenaClient.ts (constructor takes {publicClient, walletClient?, addresses}; read methods: getAgent, getAgentCount, getTask, getTaskCount, getDecision, getReputation, getSkills; write methods: registerAgent, createTask (payable), acceptTask, recordDecision, submitResult, verifyTask, submitScore, releasePayment)
- src/agents.ts, src/tasks.ts, src/decisions.ts, src/reputation.ts (focused helper modules the client composes)
- src/index.ts (barrel)
Strict types, no any. Hash helpers can come from @spartarena/shared. Ensure it would typecheck.`,
    { label: 'pkg:sdk', phase: 'Packages' }),

  () => agent(`${CTX}

YOUR SCOPE: extend \`apps/agent-runner\` ONLY by ADDING new files (do not break existing ones).
Add:
- src/agents/YieldStrategistAgent.ts — mirrors AlphaSentinelAgent structure, produces a validated YieldStrategistOutput (conservative mETH/USDY/MNT allocation, policy warnings, deterministic risk/confidence). Uses the same LlmProvider + a small asset-data tool (mock) you create at src/tools/assets.ts that records ToolCalls.
- src/agents/BaseAgent.ts — extract a shared interface/type (AgentRun<T>) the two agents conform to (re-export, keep AlphaSentinel working).
- src/prompts/alpha-sentinel.system.ts, src/prompts/yield-strategist.system.ts, src/prompts/verifier.system.ts — extract system prompts as named exports and have the agents import them.
- Update src/demo.ts is OK ONLY to optionally also run the yield agent in a second section (keep alpha flow intact). If unsure, instead add src/demo-yield.ts.
- README.md for apps/agent-runner documenting both agents, offline vs --onchain modes, env vars.
Verify by running: cd ${ROOT}/apps/agent-runner && node --import tsx src/demo.ts (must still succeed). Report the result.`,
    { label: 'pkg:agent-extras', phase: 'Packages' }),
])

log(`Packages phase done: ${pkgResults.filter(Boolean).length}/4 agents reported`)

phase('Apps')

const appResults = await parallel([
  () => agent(`${CTX}

YOUR SCOPE: \`apps/api\` — production backend. Stack: Node + Fastify + TypeScript (ESM) + Prisma (PostgreSQL) + viem. Use "@spartarena/shared" and "@spartarena/sdk" (workspace:*).
Create a complete, typecheck-clean Fastify app:
- package.json (name "@spartarena/api", scripts: dev (tsx watch src/main.ts), build (tsc), start, prisma:generate, prisma:migrate, db:seed), deps: fastify, @fastify/cors, @fastify/sensible, zod, viem, @prisma/client, pino; devDeps: prisma, tsx, typescript, @types/node
- tsconfig.json, README.md, .env.example (DATABASE_URL, REDIS_URL optional, RPC, contract addresses, BACKEND_SIGNER_PRIVATE_KEY, VERIFIER_PRIVATE_KEY, PORT)
- prisma/schema.prisma — models: User, Agent, Task, Decision, ReputationScore, Event (mirror plan.md §12 DB schema; use cuid ids + chain_* fields + timestamps + relations + enums for status)
- prisma/seed.ts — seed a demo agent + task
- src/main.ts (bootstrap), src/server.ts (build Fastify instance, register plugins + routes + error handler), src/env.ts (zod-validated env), src/db.ts (PrismaClient singleton), src/lib/logger.ts, src/lib/errors.ts, src/lib/pagination.ts, src/lib/hash.ts
- src/chain/publicClient.ts, walletClient.ts, contractReads.ts, contractWrites.ts (use @spartarena/sdk where possible)
- modules (each: routes + service + repository + zod schema): health, agents, tasks, decisions, reputation, execution (queues an agent run + writes proof via chain), indexer (event-handlers + cursor; a poller that reads logs and upserts into DB), notifications (telegram/discord services, no-op if env unset)
- Implement the REST endpoints from plan.md §16 (agents, tasks, decisions, reputation, demo). The /demo/* and /tasks/:id/execute endpoints should invoke an execution service that (for MVP) produces a deterministic decision, hashes it, and (if signer + addresses present) writes on-chain; otherwise returns the computed proof.
Use a consistent API envelope { success, data, error, meta? }. Validate all inputs with zod. Make tsc --noEmit pass (you may need to run prisma generate; if prisma binary unavailable, still keep types via a thin typed wrapper and note it). Report what you built and any TODOs.`,
    { label: 'app:api', phase: 'Apps' }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/web\` — production Next.js 15 App Router frontend (TypeScript, TailwindCSS, wagmi v2, viem, @tanstack/react-query, framer-motion). This is the showcase. Use "@spartarena/shared" and "@spartarena/sdk" (workspace:*). Use the Spartan/arena dark+bronze aesthetic and the brand label mapping.
Create a complete, buildable app:
- package.json (name "@spartarena/web", scripts dev/build/start/lint/typecheck), tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.mjs, .env.example, README.md, next-env.d.ts
- src/app/layout.tsx (root layout, Providers, Header/Footer), src/app/globals.css (Tailwind + theme tokens), src/app/page.tsx (stunning animated landing: hero, "Agents enter the arena. Tasks become battles. Proof becomes reputation." value props, how-it-works, CTA buttons)
- Routes: src/app/arena/page.tsx (Arena marketplace), arena/new/page.tsx (Create Battle form), arena/[taskId]/page.tsx (Battle detail with timeline + proof + pay), agents/page.tsx (Spartan directory), agents/register/page.tsx (Register form -> registerAgent), agents/[agentId]/page.tsx (Spartan Passport profile + reputation chart + decision history), leaderboard/page.tsx (Hall of Glory), chronicle/page.tsx (global War Chronicle table), demo/page.tsx (idiot-proof guided judge demo: 7 steps Register→Create→Run→Record→Verify→Release→Hall of Glory with a stepper)
- src/app/api/health/route.ts, src/app/api/og/route.tsx (OG share card)
- src/components: layout/{Header,Footer}, providers/{Providers,WagmiProvider,QueryProvider}, arena/{BattleCard,CreateBattleForm,BattleStatusBadge,BattleTimeline,RewardVault}, agents/{AgentCard,SpartanPassport,RegisterAgentForm,SkillBadge,ReputationChart}, decisions/{DecisionCard,DecisionProof,HashViewer,ChronicleTable}, leaderboard/{HallOfGloryTable,ReputationBreakdown}, demo/{DemoStepper,JudgeModeBanner,DemoActionButton}, ui/{Button,Card,Badge,Input,Textarea,Dialog,Toast,Stat,Spinner}
- src/config/{chains.ts,contracts.ts,wagmi.ts}, src/lib/{api.ts (calls the @spartarena/api backend with the envelope),format.ts,hash.ts,explorer.ts}, src/hooks/{useAgents,useTasks,useDecisions,useLeaderboard,useWriteContracts}, src/types/*
- Read from the backend API via NEXT_PUBLIC_API_URL; gracefully fall back to rich mock data when the API is unreachable so the UI always renders for judges. On-chain writes go through wagmi/viem using addresses from NEXT_PUBLIC_* env.
Make it visually polished and ensure \`next build\` would succeed (no type errors, all imports resolve, 'use client' where hooks used). Report key files + any TODOs.`,
    { label: 'app:web', phase: 'Apps' }),
])

log(`Apps phase done: ${appResults.filter(Boolean).length}/2 agents reported`)

phase('Docs')

const docs = await agent(`${CTX}

YOUR SCOPE: top-level docs + root README. The whole monorepo now exists (packages/contracts, packages/shared, packages/sdk, packages/byreal-adapter, apps/api, apps/web, apps/agent-runner). Explore the repo to get details right.
Create:
- ${ROOT}/README.md — follow plan.md §21 structure: title, tagline, problem, solution, key features, architecture (ascii diagram), monorepo layout, contracts table (addresses TBD), local setup (pnpm install; foundry test; deploy local; run agent; web dev), Mantle Sepolia deploy steps, env, demo links placeholders, team. Polished, judge-facing.
- ${ROOT}/docs/pitch.md, architecture.md, demo-script.md (2-min, from plan §18), judging-alignment.md (map to Agentic Wallets & Economy / AI DevTools / Deployment Award), deployment-guide.md, contracts.md, agent-design.md
- ${ROOT}/LICENSE (MIT, year 2026)
- ${ROOT}/Makefile with handy targets (install, test, deploy-local, deploy-sepolia, web, api, agent-demo)
- ${ROOT}/demo/ sample json files: sample-agent-metadata.json, sample-task.json, sample-alpha-output.json, sample-yield-output.json (match the schemas)
Report the files created.`,
  { label: 'docs', phase: 'Docs' })

return {
  packages: pkgResults.filter(Boolean).length,
  apps: appResults.filter(Boolean).length,
  docs: docs ? 'ok' : 'failed',
}
