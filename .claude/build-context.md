# SpartArena — Shared Build Context (for subagents)

Monorepo at `/Users/arhansubasi/spartarena`. pnpm workspaces + Turbo-free.
Packages glob: `apps/*`, `packages/*`. Package manager: pnpm 11, Node 24, type:module where TS/ESM.

## Already built (DO NOT modify these, only import/reference)
- `packages/contracts` — Foundry. 5 contracts: AgentRegistry, TaskEscrow, DecisionLedger, ReputationEngine, SkillRegistry. ABIs at `packages/contracts/abi/*.json`. 27 passing tests. Deploy writes `packages/contracts/deployments/<chainId>.json`.
- `apps/agent-runner` — TS/ESM. AlphaSentinelAgent, hashing (keccak256 of JSON.stringify), mock LLM provider, MantleReader tool, verifier, ChainWriter (viem), demo.ts. Schemas in `apps/agent-runner/src/schemas.ts`.

## Chain config
- Mantle Sepolia: chainId 5003, RPC https://rpc.sepolia.mantle.xyz, explorer https://sepolia.mantlescan.xyz, native token MNT (18 decimals).
- Local: anvil chainId 31337.

## Contract surface (key functions)
- AgentRegistry: `registerAgent(address agentWallet, string metadataURI, bytes32 skillsHash) returns (uint256)`, `getAgent(uint256)`, `agentsOf(address)`, `agentCount()`. Event `AgentRegistered(uint256 agentId, address owner, address agentWallet, string metadataURI, bytes32 skillsHash)`.
- TaskEscrow: `createTask(bytes32 descriptionHash, uint256 deadline) payable returns (uint256)`, `acceptTask(uint256 taskId, uint256 agentId)`, `submitResult(...)` (writer only), `verifyTask(uint256)` (writer), `releasePayment(uint256)`, `refundExpiredTask(uint256)`, `getTask(uint256)`, `taskCount()`. Enum TaskStatus { Open, Accepted, Submitted, Verified, Paid, Cancelled }. Events: TaskCreated, TaskAccepted, ResultSubmitted, TaskVerified, PaymentReleased, TaskCancelled.
- DecisionLedger: `recordDecision(agentId, taskId, promptHash, outputHash, toolsHash, confidence, riskScore, actionType) returns (uint256)` (writer only). Event DecisionRecorded(...). `getDecision`, `decisionsOfAgent`, `decisionsOfTask`, `decisionCount`.
- ReputationEngine: `submitScore(agentId, taskId, accuracy, safety, speed, userRating)` (writer), `recordEarnings(agentId, amount)` (writer), `getReputation(agentId) returns (struct)`. Weighted total: accuracy 40, safety 30, speed 15, user 15.
- SkillRegistry: `allSkillIds()`, `getSkill(bytes32)`. Seeded skills: ALPHA_DETECTION, RWA_STRATEGY, GAS_OPTIMIZATION, CONTRACT_AUDIT, BYREAL_POOL_ANALYSIS, BYREAL_SWAP_PREVIEW, TELEGRAM_ALERT.

## Brand / UI label mapping (use everywhere in UI copy)
AI Agent → Spartan · Task → Battle · Marketplace → Arena · Reputation → Honor · Score → Glory · Agent NFT → Spartan Passport · Leaderboard → Hall of Glory · Decision log → War Chronicle · Verifier → Oracle Judge · Escrow → Battle Vault.
Tagline: "The on-chain arena where AI agents fight for jobs, earn rewards, and build verifiable reputation on Mantle."
Aesthetic: dark, bronze/gold (#C8A24B) + crimson (#B23A48) accents on near-black (#0B0B0E), Spartan/arena theme, modern, clean, animated.

## Agent output schemas (already defined in agent-runner/src/schemas.ts — mirror in shared)
AlphaSentinelOutput { agentName:"AlphaSentinel"; taskId; decisionType:"ALPHA_ALERT"; summary; evidence[]; confidence(0-100); riskScore(0-100); recommendedAction:"ignore"|"watchlist"|"alert"|"escalate"; humanExplanation }
YieldStrategistOutput { agentName:"YieldStrategist"; taskId; decisionType:"RWA_STRATEGY"; strategySummary; assets[{symbol,suggestedWeight,reason}]; confidence; riskScore; policyWarnings[]; humanExplanation }

## Quality bar (production level)
- Strict TypeScript, no `any` leaks, validate inputs at boundaries (zod), comprehensive error handling, no hardcoded secrets (env only), small focused files (<400 lines), immutable patterns.
- Each package: its own package.json (name `@spartarena/<x>`), tsconfig, README. Reference workspace deps as `"@spartarena/shared": "workspace:*"`.
- Make code typecheck-clean. Do not edit files outside your assigned directory.
