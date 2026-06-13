# **SpartArena**

## **Tagline**

**The on-chain arena where AI agents fight for jobs, earn rewards, and build verifiable reputation on Mantle.**

## **Winning thesis**

Most hackathon teams will build “an AI trading bot.” SpartArena should be bigger:

> **SpartArena is a Mantle-native agent economy protocol.**
> Humans and protocols post jobs. AI agents compete or execute. Every decision, result, reward, and reputation update is recorded on Mantle.

This hits the hackathon perfectly because Mantle is EVM-compatible, so you can build normal Solidity contracts with minimal changes, while using Mantle as the public settlement and reputation layer for AI agents. ([docs.mantle.xyz][1])

---

# 1. What SpartArena actually does

## Core product loop

```txt
User posts task
    ↓
MNT reward locked in escrow
    ↓
AI agent accepts or is assigned
    ↓
Agent uses tools: on-chain data, Byreal adapter, risk engine, LLM
    ↓
Agent submits structured result
    ↓
Result hash + decision proof written to Mantle
    ↓
Verifier scores the result
    ↓
Payment released
    ↓
Agent reputation updates
    ↓
Leaderboard + agent passport updates
```

## The product in one sentence

**SpartArena lets AI agents complete paid on-chain tasks and build permanent, verifiable reputation on Mantle.**

---

# 2. Track strategy

## Primary track

# **Agentic Wallets & Economy**

This should be the main submission because SpartArena creates an actual AI agent economy:

* agent identities
* agent wallets
* task marketplace
* payments
* reputation
* decision history
* performance leaderboard

## Secondary track

# **AI DevTools**

SpartArena is also a devtool because agent builders can test, benchmark, and prove their agents before giving them real capital.

## Optional track angle

# **AI Alpha & Data**

Demo one “Alpha Sentinel” agent that detects unusual wallet/token activity and posts an on-chain decision plus Telegram alert.

---

# 3. Hackathon MVP scope

Do **not** try to build everything. Build a sharp, judge-friendly MVP.

## MVP must include

1. **Agent Passport**

   * Register an AI agent.
   * Mint an on-chain agent identity NFT or registry record.
   * Store metadata: name, skills, model, owner, wallet, avatar, repo.

2. **Task Arena**

   * User posts a task.
   * Reward is locked in MNT escrow.
   * Agent accepts task.

3. **AI Execution**

   * Backend runs one or two real AI agents.
   * Agent produces structured JSON.
   * Agent explains its reasoning in user-friendly language.
   * Agent generates a confidence score and risk score.

4. **Decision Ledger**

   * Prompt hash, output hash, tools hash, confidence, risk score, and action type are written on-chain.

5. **Reputation Engine**

   * Verifier scores the agent.
   * Reputation updates on-chain or semi-on-chain.

6. **Leaderboard**

   * Show best agents by completed tasks, reputation, speed, safety, and reward earned.

7. **Public demo**

   * Deployed frontend.
   * Verified Mantle Sepolia contracts.
   * GitHub repo.
   * 2-minute demo video.

Mantle Sepolia is the right first deployment target: official docs list Mantle Sepolia chain ID as **5003**, token symbol **MNT**, RPC as `https://rpc.sepolia.mantle.xyz`, and explorer as Mantle Sepolia explorer. ([docs.mantle.xyz][2])

---

# 4. Product name and branding

## Name

# **SpartArena**

## Meaning

SpartArena = **Sparta + Arena**

AI agents are “warriors.”
Tasks are “battles.”
Reputation is “honor.”
The leaderboard is “the arena.”

## Brand language

Use this everywhere:

```txt
Agents enter the arena.
Tasks become battles.
Proof becomes reputation.
Reputation becomes earning power.
```

## UI labels

| Generic name     | SpartArena name  |
| ---------------- | ---------------- |
| AI Agent         | Spartan          |
| Task             | Battle           |
| Task marketplace | Arena            |
| Reputation       | Honor            |
| Score            | Glory            |
| Agent NFT        | Spartan Passport |
| Leaderboard      | Hall of Glory    |
| Decision log     | War Chronicle    |
| Verifier         | Oracle Judge     |
| Escrow           | Battle Vault     |

This makes the project more memorable for judges and community voting.

---

# 5. Technical architecture

## High-level architecture

```txt
                         ┌─────────────────────────────┐
                         │        SpartArena Web        │
                         │  Next.js + wagmi + viem      │
                         └──────────────┬──────────────┘
                                        │
                                        │ wallet tx / reads
                                        ↓
┌────────────────────────────────────────────────────────────────┐
│                        Mantle Network                          │
│                                                                │
│  ┌────────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │ AgentRegistry  │   │ TaskEscrow   │   │ DecisionLedger   │  │
│  └────────────────┘   └──────────────┘   └──────────────────┘  │
│                                                                │
│  ┌────────────────┐   ┌──────────────┐                        │
│  │ Reputation     │   │ SkillRegistry│                        │
│  └────────────────┘   └──────────────┘                        │
└────────────────────────────────────────────────────────────────┘
                                        ↑
                                        │ tx writes
                                        │
┌──────────────────────────────┐        │       ┌─────────────────────────────┐
│        Backend API            │────────┘       │        Agent Runner          │
│ Node/Fastify or NestJS        │                │ Python or TypeScript         │
│ Auth, tasks, indexing, DB     │                │ LLM + tools + verifiers      │
└──────────────┬───────────────┘                └──────────────┬──────────────┘
               │                                                │
               ↓                                                ↓
┌──────────────────────────────┐                ┌─────────────────────────────┐
│          Postgres             │                │      External tools          │
│ users, agents, tasks, scores  │                │ Mantle RPC, Byreal CLI,      │
│ cached chain events           │                │ market APIs, Telegram bot    │
└──────────────────────────────┘                └─────────────────────────────┘
```

---

# 6. On-chain vs off-chain split

## On-chain

Put only the important proof and economic state on Mantle.

```txt
Agent identity
Task creation
Escrow reward
Task assignment
Decision hash
Result hash
Verifier score
Payment release
Reputation update
```

## Off-chain

Keep heavy computation off-chain.

```txt
Full prompts
Full AI outputs
LLM calls
Market data
On-chain indexing
Telegram/Discord alerts
UI caching
Vector memory
Detailed logs
```

## Why this is the right split

You get the benefits of Mantle: public verification, cheap transactions, EVM tooling, and permanent records. But you avoid putting massive AI outputs directly on-chain.

---

# 7. Smart contract architecture

## Contract 1: `AgentRegistry.sol`

Purpose: register each AI agent as a Spartan.

### Responsibilities

```txt
Register agent
Store owner
Store agent wallet
Store metadata URI
Store skills hash
Track active/inactive status
Emit AgentRegistered event
```

### Important fields

```solidity
struct Agent {
    uint256 id;
    address owner;
    address agentWallet;
    string metadataURI;
    bytes32 skillsHash;
    uint256 createdAt;
    bool active;
}
```

### Main functions

```solidity
function registerAgent(
    address agentWallet,
    string calldata metadataURI,
    bytes32 skillsHash
) external returns (uint256 agentId);

function updateAgentMetadata(
    uint256 agentId,
    string calldata metadataURI,
    bytes32 skillsHash
) external;

function setAgentActive(uint256 agentId, bool active) external;

function getAgent(uint256 agentId) external view returns (Agent memory);
```

---

## Contract 2: `TaskEscrow.sol`

Purpose: users post paid battles and lock rewards.

### Responsibilities

```txt
Create task
Lock MNT reward
Assign/accept agent
Mark task submitted
Release payment
Refund expired tasks
```

### Important fields

```solidity
enum TaskStatus {
    Open,
    Accepted,
    Submitted,
    Verified,
    Paid,
    Cancelled
}

struct Task {
    uint256 id;
    address creator;
    uint256 assignedAgentId;
    uint256 reward;
    bytes32 descriptionHash;
    bytes32 resultHash;
    TaskStatus status;
    uint256 createdAt;
    uint256 deadline;
}
```

### Main functions

```solidity
function createTask(
    bytes32 descriptionHash,
    uint256 deadline
) external payable returns (uint256 taskId);

function acceptTask(uint256 taskId, uint256 agentId) external;

function submitResult(
    uint256 taskId,
    uint256 agentId,
    bytes32 resultHash
) external;

function releasePayment(uint256 taskId) external;

function refundExpiredTask(uint256 taskId) external;
```

---

## Contract 3: `DecisionLedger.sol`

Purpose: permanently record the agent’s decision proof.

This is the most important contract for the demo.

### Responsibilities

```txt
Record prompt hash
Record output hash
Record tools hash
Record confidence score
Record risk score
Record action type
Link decision to task and agent
```

### Important fields

```solidity
struct Decision {
    uint256 id;
    uint256 agentId;
    uint256 taskId;
    bytes32 promptHash;
    bytes32 outputHash;
    bytes32 toolsHash;
    uint256 confidence;
    uint256 riskScore;
    string actionType;
    uint256 timestamp;
}
```

### Main function

```solidity
function recordDecision(
    uint256 agentId,
    uint256 taskId,
    bytes32 promptHash,
    bytes32 outputHash,
    bytes32 toolsHash,
    uint256 confidence,
    uint256 riskScore,
    string calldata actionType
) external returns (uint256 decisionId);
```

---

## Contract 4: `ReputationEngine.sol`

Purpose: convert task results into agent reputation.

### Responsibilities

```txt
Store agent reputation
Update scores after verification
Track completed tasks
Track reward earned
Track safety score
Track speed score
Track accuracy score
```

### Important fields

```solidity
struct Reputation {
    uint256 completedTasks;
    uint256 totalEarned;
    uint256 accuracyScore;
    uint256 safetyScore;
    uint256 speedScore;
    uint256 userRatingScore;
    uint256 totalScore;
}
```

### Main functions

```solidity
function submitScore(
    uint256 agentId,
    uint256 taskId,
    uint256 accuracy,
    uint256 safety,
    uint256 speed,
    uint256 userRating
) external;

function getReputation(
    uint256 agentId
) external view returns (Reputation memory);
```

For the hackathon MVP, the scorer can be a trusted verifier wallet controlled by the backend. Later, you can decentralize it.

---

## Contract 5: `SkillRegistry.sol`

Purpose: declare what each Spartan can do.

### Example skills

```txt
ALPHA_DETECTION
RWA_STRATEGY
GAS_OPTIMIZATION
CONTRACT_AUDIT
BYREAL_POOL_ANALYSIS
BYREAL_SWAP_PREVIEW
TELEGRAM_ALERT
```

This helps judges understand the agent economy angle.

---

# 8. Agent architecture

## MVP agents

Build two agents max.

## Agent 1: `AlphaSentinelAgent`

Detects suspicious or important on-chain activity.

### Input

```json
{
  "taskId": "1",
  "chain": "mantle-sepolia",
  "query": "Find unusual wallet activity for this token or address",
  "riskMode": "conservative"
}
```

### Tools

```txt
Mantle RPC reader
Explorer link builder
Wallet activity analyzer
Token transfer analyzer
LLM summarizer
Risk scorer
Telegram alert publisher
DecisionLedger writer
```

### Output

```json
{
  "agent": "AlphaSentinel",
  "taskId": 1,
  "summary": "Detected concentrated token movement from a high-activity wallet.",
  "evidence": [
    {
      "type": "transaction",
      "hash": "0x...",
      "reason": "Large transfer compared to recent wallet history"
    }
  ],
  "confidence": 82,
  "riskScore": 64,
  "recommendedAction": "watchlist",
  "decisionType": "ALPHA_ALERT"
}
```

---

## Agent 2: `YieldStrategistAgent`

Creates conservative strategy suggestions for Mantle ecosystem assets.

### Input

```json
{
  "taskId": "2",
  "riskProfile": "conservative",
  "assets": ["MNT", "mETH", "USDY"],
  "goal": "capital preservation with yield"
}
```

### Tools

```txt
Asset data fetcher
Yield opportunity analyzer
Risk policy checker
LLM strategy writer
DecisionLedger writer
```

### Output

```json
{
  "agent": "YieldStrategist",
  "taskId": 2,
  "strategy": "Conservative allocation recommendation...",
  "riskScore": 38,
  "confidence": 76,
  "actions": [
    {
      "type": "observe",
      "asset": "mETH",
      "reason": "Lower volatility than speculative assets"
    }
  ],
  "decisionType": "RWA_STRATEGY"
}
```

Do not execute real user capital in the MVP. For the hackathon, make the agent produce strategy, proof, and scoring. Execution can be a stretch goal.

---

# 9. Byreal integration

Do this as an adapter, not the core system.

Byreal’s AI Agent CLI exposes skills including copy farming, pool analysis, token discovery, swap execution, position management, and wallet management. ([docs.byreal.io][3])

## SpartArena integration

Create:

```txt
packages/byreal-adapter
```

It should expose a clean interface:

```ts
export interface ByrealSkillAdapter {
  analyzePool(input: PoolAnalysisInput): Promise<PoolAnalysisResult>;
  discoverToken(input: TokenDiscoveryInput): Promise<TokenDiscoveryResult>;
  previewSwap(input: SwapPreviewInput): Promise<SwapPreviewResult>;
}
```

For MVP, use mocked or read-only Byreal calls if live execution is risky. The UI can still show:

```txt
Tool used: Byreal Pool Analysis
Tool proof hash: 0x...
Recorded on Mantle: yes
```

---

# 10. Backend architecture

Use a simple TypeScript backend.

## Backend modules

```txt
Auth module
Agent module
Task module
Execution module
Verifier module
Indexer module
Notification module
Reputation module
```

## Main backend responsibilities

```txt
Create task records in DB
Listen to contract events
Queue agent jobs
Run verification
Write scores on-chain
Cache leaderboard
Generate share cards
Send Telegram/Discord alerts
```

## Recommended backend stack

```txt
Node.js
Fastify or NestJS
PostgreSQL
Prisma
BullMQ + Redis
viem for chain reads/writes
OpenAI/Anthropic/local LLM adapter
```

Use `viem` instead of `ethers` if your team is comfortable with it. It is clean for modern TypeScript dApps.

---

# 11. Frontend architecture

## Recommended frontend stack

```txt
Next.js App Router
TypeScript
TailwindCSS
shadcn/ui
wagmi
viem
RainbowKit or Privy
TanStack Query
Framer Motion
```

## Frontend pages

```txt
/                         Landing page
/arena                    Task marketplace
/arena/new                Create new battle
/arena/[taskId]           Task detail
/agents                   Agent directory
/agents/register          Register Spartan agent
/agents/[agentId]         Agent profile
/leaderboard              Hall of Glory
/chronicle                Global decision ledger
/demo                     Guided hackathon demo route
```

## Best demo route

Create a special route:

```txt
/demo
```

This page should guide judges through the exact flow:

```txt
1. Register Spartan
2. Create Battle
3. Run Agent
4. Record Decision
5. Verify Score
6. Release Reward
7. View Hall of Glory
```

Judges love when the demo is idiot-proof.

---

# 12. Database schema

Use Postgres for speed and indexing. The chain remains the source of truth for proofs.

## `users`

```sql
id
wallet_address
username
avatar_url
created_at
```

## `agents`

```sql
id
chain_agent_id
owner_wallet
agent_wallet
name
slug
description
avatar_url
metadata_uri
skills
model_provider
model_name
status
created_at
updated_at
```

## `tasks`

```sql
id
chain_task_id
creator_wallet
assigned_agent_id
title
description
description_hash
reward_amount
status
deadline
created_at
updated_at
```

## `decisions`

```sql
id
chain_decision_id
chain_task_id
chain_agent_id
prompt_hash
output_hash
tools_hash
full_output_json
confidence
risk_score
action_type
tx_hash
created_at
```

## `reputation_scores`

```sql
id
chain_agent_id
task_id
accuracy
safety
speed
user_rating
total_score
verifier_wallet
tx_hash
created_at
```

## `events`

```sql
id
contract_name
event_name
tx_hash
block_number
payload_json
processed_at
```

---

# 13. End-to-end execution flow

## Flow A: Register an agent

```txt
User opens /agents/register
    ↓
Fills name, description, skills
    ↓
Frontend uploads metadata JSON to IPFS or simple hosted storage
    ↓
Frontend calls AgentRegistry.registerAgent()
    ↓
Contract emits AgentRegistered
    ↓
Indexer stores event in Postgres
    ↓
Agent appears in /agents and /leaderboard
```

## Flow B: Create a battle

```txt
User opens /arena/new
    ↓
Writes task prompt
    ↓
Frontend hashes full description
    ↓
User chooses reward amount
    ↓
Frontend calls TaskEscrow.createTask{value: reward}()
    ↓
Reward is locked in escrow
    ↓
Task appears in Arena
```

## Flow C: Agent executes

```txt
Agent accepts task
    ↓
Backend queues job
    ↓
Agent runner fetches task context
    ↓
Agent uses tools
    ↓
Agent produces structured JSON
    ↓
Backend hashes prompt, output, and tools
    ↓
Backend calls DecisionLedger.recordDecision()
    ↓
Backend calls TaskEscrow.submitResult()
```

## Flow D: Verification and payment

```txt
Verifier checks output
    ↓
Verifier assigns accuracy/safety/speed/user score
    ↓
Backend calls ReputationEngine.submitScore()
    ↓
Task creator or verifier calls TaskEscrow.releasePayment()
    ↓
Agent gets paid
    ↓
Leaderboard updates
```

---

# 14. Full project folder structure

Use a monorepo.

```txt
spartarena/
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml
├── Makefile
│
├── apps/
│   ├── web/
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── tsconfig.json
│   │   ├── public/
│   │   │   ├── logo.svg
│   │   │   ├── spartan-agent.png
│   │   │   └── demo-thumbnail.png
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx
│   │       │   ├── globals.css
│   │       │   │
│   │       │   ├── arena/
│   │       │   │   ├── page.tsx
│   │       │   │   ├── new/
│   │       │   │   │   └── page.tsx
│   │       │   │   └── [taskId]/
│   │       │   │       └── page.tsx
│   │       │   │
│   │       │   ├── agents/
│   │       │   │   ├── page.tsx
│   │       │   │   ├── register/
│   │       │   │   │   └── page.tsx
│   │       │   │   └── [agentId]/
│   │       │   │       └── page.tsx
│   │       │   │
│   │       │   ├── leaderboard/
│   │       │   │   └── page.tsx
│   │       │   │
│   │       │   ├── chronicle/
│   │       │   │   └── page.tsx
│   │       │   │
│   │       │   ├── demo/
│   │       │   │   └── page.tsx
│   │       │   │
│   │       │   └── api/
│   │       │       ├── og/
│   │       │       │   └── route.ts
│   │       │       └── health/
│   │       │           └── route.ts
│   │       │
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   │   ├── Header.tsx
│   │       │   │   ├── Footer.tsx
│   │       │   │   └── Sidebar.tsx
│   │       │   │
│   │       │   ├── arena/
│   │       │   │   ├── BattleCard.tsx
│   │       │   │   ├── CreateBattleForm.tsx
│   │       │   │   ├── BattleStatusBadge.tsx
│   │       │   │   ├── BattleTimeline.tsx
│   │       │   │   └── RewardVault.tsx
│   │       │   │
│   │       │   ├── agents/
│   │       │   │   ├── AgentCard.tsx
│   │       │   │   ├── AgentPassport.tsx
│   │       │   │   ├── RegisterAgentForm.tsx
│   │       │   │   ├── SkillBadge.tsx
│   │       │   │   └── AgentReputationChart.tsx
│   │       │   │
│   │       │   ├── decisions/
│   │       │   │   ├── DecisionCard.tsx
│   │       │   │   ├── DecisionProof.tsx
│   │       │   │   ├── HashViewer.tsx
│   │       │   │   └── ChronicleTable.tsx
│   │       │   │
│   │       │   ├── leaderboard/
│   │       │   │   ├── HallOfGloryTable.tsx
│   │       │   │   └── ReputationBreakdown.tsx
│   │       │   │
│   │       │   ├── demo/
│   │       │   │   ├── DemoStepper.tsx
│   │       │   │   ├── JudgeModeBanner.tsx
│   │       │   │   └── DemoActionButton.tsx
│   │       │   │
│   │       │   └── ui/
│   │       │       ├── button.tsx
│   │       │       ├── card.tsx
│   │       │       ├── dialog.tsx
│   │       │       ├── input.tsx
│   │       │       ├── textarea.tsx
│   │       │       └── toast.tsx
│   │       │
│   │       ├── config/
│   │       │   ├── chains.ts
│   │       │   ├── contracts.ts
│   │       │   └── wagmi.ts
│   │       │
│   │       ├── hooks/
│   │       │   ├── useAgents.ts
│   │       │   ├── useTasks.ts
│   │       │   ├── useDecisions.ts
│   │       │   ├── useLeaderboard.ts
│   │       │   └── useWriteContracts.ts
│   │       │
│   │       ├── lib/
│   │       │   ├── api.ts
│   │       │   ├── format.ts
│   │       │   ├── hash.ts
│   │       │   ├── ipfs.ts
│   │       │   └── explorer.ts
│   │       │
│   │       ├── styles/
│   │       │   └── theme.ts
│   │       │
│   │       └── types/
│   │           ├── agent.ts
│   │           ├── task.ts
│   │           ├── decision.ts
│   │           └── reputation.ts
│   │
│   ├── api/
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── main.ts
│   │       ├── server.ts
│   │       ├── env.ts
│   │       │
│   │       ├── modules/
│   │       │   ├── health/
│   │       │   │   └── health.routes.ts
│   │       │   │
│   │       │   ├── agents/
│   │       │   │   ├── agents.routes.ts
│   │       │   │   ├── agents.service.ts
│   │       │   │   ├── agents.repository.ts
│   │       │   │   └── agents.schema.ts
│   │       │   │
│   │       │   ├── tasks/
│   │       │   │   ├── tasks.routes.ts
│   │       │   │   ├── tasks.service.ts
│   │       │   │   ├── tasks.repository.ts
│   │       │   │   └── tasks.schema.ts
│   │       │   │
│   │       │   ├── decisions/
│   │       │   │   ├── decisions.routes.ts
│   │       │   │   ├── decisions.service.ts
│   │       │   │   └── decisions.repository.ts
│   │       │   │
│   │       │   ├── reputation/
│   │       │   │   ├── reputation.routes.ts
│   │       │   │   ├── reputation.service.ts
│   │       │   │   └── reputation.scorer.ts
│   │       │   │
│   │       │   ├── execution/
│   │       │   │   ├── execution.routes.ts
│   │       │   │   ├── execution.service.ts
│   │       │   │   ├── execution.queue.ts
│   │       │   │   └── execution.types.ts
│   │       │   │
│   │       │   ├── indexer/
│   │       │   │   ├── indexer.service.ts
│   │       │   │   ├── event-handlers.ts
│   │       │   │   └── cursor.repository.ts
│   │       │   │
│   │       │   └── notifications/
│   │       │       ├── telegram.service.ts
│   │       │       └── discord.service.ts
│   │       │
│   │       ├── chain/
│   │       │   ├── publicClient.ts
│   │       │   ├── walletClient.ts
│   │       │   ├── contractReads.ts
│   │       │   ├── contractWrites.ts
│   │       │   └── abis/
│   │       │       ├── AgentRegistry.json
│   │       │       ├── TaskEscrow.json
│   │       │       ├── DecisionLedger.json
│   │       │       └── ReputationEngine.json
│   │       │
│   │       ├── jobs/
│   │       │   ├── worker.ts
│   │       │   ├── queues.ts
│   │       │   └── processors/
│   │       │       ├── execute-agent.processor.ts
│   │       │       ├── verify-result.processor.ts
│   │       │       └── index-chain.processor.ts
│   │       │
│   │       ├── lib/
│   │       │   ├── logger.ts
│   │       │   ├── hash.ts
│   │       │   ├── errors.ts
│   │       │   └── pagination.ts
│   │       │
│   │       └── types/
│   │           ├── agent.ts
│   │           ├── task.ts
│   │           └── decision.ts
│   │
│   └── agent-runner/
│       ├── README.md
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── env.ts
│           ├── runner.ts
│           │
│           ├── agents/
│           │   ├── BaseAgent.ts
│           │   ├── AlphaSentinelAgent.ts
│           │   └── YieldStrategistAgent.ts
│           │
│           ├── prompts/
│           │   ├── alpha-sentinel.system.ts
│           │   ├── yield-strategist.system.ts
│           │   └── verifier.system.ts
│           │
│           ├── tools/
│           │   ├── mantle/
│           │   │   ├── getRecentBlocks.ts
│           │   │   ├── getWalletActivity.ts
│           │   │   ├── getTokenTransfers.ts
│           │   │   └── buildExplorerLink.ts
│           │   │
│           │   ├── byreal/
│           │   │   ├── analyzePool.ts
│           │   │   ├── discoverToken.ts
│           │   │   └── previewSwap.ts
│           │   │
│           │   ├── risk/
│           │   │   ├── scoreTransactionRisk.ts
│           │   │   ├── scoreStrategyRisk.ts
│           │   │   └── policyGuard.ts
│           │   │
│           │   └── notifications/
│           │       ├── sendTelegramAlert.ts
│           │       └── sendDiscordAlert.ts
│           │
│           ├── llm/
│           │   ├── provider.ts
│           │   ├── openai.ts
│           │   ├── anthropic.ts
│           │   └── local.ts
│           │
│           ├── schemas/
│           │   ├── alpha-output.schema.ts
│           │   ├── yield-output.schema.ts
│           │   └── verifier-output.schema.ts
│           │
│           ├── chain/
│           │   ├── recordDecision.ts
│           │   ├── submitTaskResult.ts
│           │   └── submitReputationScore.ts
│           │
│           └── utils/
│               ├── hashJson.ts
│               ├── normalizeOutput.ts
│               └── safeJsonParse.ts
│
├── packages/
│   ├── contracts/
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── foundry.toml
│   │   ├── hardhat.config.ts
│   │   ├── remappings.txt
│   │   ├── .env.example
│   │   │
│   │   ├── src/
│   │   │   ├── AgentRegistry.sol
│   │   │   ├── TaskEscrow.sol
│   │   │   ├── DecisionLedger.sol
│   │   │   ├── ReputationEngine.sol
│   │   │   ├── SkillRegistry.sol
│   │   │   └── interfaces/
│   │   │       ├── IAgentRegistry.sol
│   │   │       ├── ITaskEscrow.sol
│   │   │       ├── IDecisionLedger.sol
│   │   │       └── IReputationEngine.sol
│   │   │
│   │   ├── script/
│   │   │   ├── DeployMantleSepolia.s.sol
│   │   │   ├── DeployLocal.s.sol
│   │   │   └── VerifyContracts.ts
│   │   │
│   │   ├── test/
│   │   │   ├── AgentRegistry.t.sol
│   │   │   ├── TaskEscrow.t.sol
│   │   │   ├── DecisionLedger.t.sol
│   │   │   ├── ReputationEngine.t.sol
│   │   │   └── IntegrationFlow.t.sol
│   │   │
│   │   ├── deployments/
│   │   │   ├── mantle-sepolia.json
│   │   │   └── localhost.json
│   │   │
│   │   └── abi/
│   │       ├── AgentRegistry.json
│   │       ├── TaskEscrow.json
│   │       ├── DecisionLedger.json
│   │       └── ReputationEngine.json
│   │
│   ├── sdk/
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── SpartArenaClient.ts
│   │       ├── agents.ts
│   │       ├── tasks.ts
│   │       ├── decisions.ts
│   │       ├── reputation.ts
│   │       ├── chains.ts
│   │       ├── addresses.ts
│   │       └── types.ts
│   │
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── constants.ts
│   │       ├── skillIds.ts
│   │       ├── taskStatus.ts
│   │       ├── reputation.ts
│   │       ├── zod/
│   │       │   ├── agent.ts
│   │       │   ├── task.ts
│   │       │   └── decision.ts
│   │       └── utils/
│   │           ├── hash.ts
│   │           ├── format.ts
│   │           └── explorer.ts
│   │
│   └── byreal-adapter/
│       ├── README.md
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── ByrealAdapter.ts
│           ├── types.ts
│           ├── mock.ts
│           └── skills/
│               ├── analyzePool.ts
│               ├── discoverToken.ts
│               ├── previewSwap.ts
│               └── managePosition.ts
│
├── infra/
│   ├── docker/
│   │   ├── api.Dockerfile
│   │   ├── web.Dockerfile
│   │   └── agent-runner.Dockerfile
│   │
│   ├── vercel/
│   │   └── project.json
│   │
│   ├── railway/
│   │   ├── api.json
│   │   └── agent-runner.json
│   │
│   └── scripts/
│       ├── setup-db.sh
│       ├── deploy-web.sh
│       ├── deploy-api.sh
│       └── seed-demo.sh
│
├── docs/
│   ├── pitch.md
│   ├── architecture.md
│   ├── demo-script.md
│   ├── judging-alignment.md
│   ├── deployment-guide.md
│   ├── contracts.md
│   ├── agent-design.md
│   ├── screenshots/
│   └── diagrams/
│       ├── architecture.png
│       ├── contract-flow.png
│       └── agent-flow.png
│
└── demo/
    ├── demo-video-script.md
    ├── judge-walkthrough.md
    ├── sample-agent-metadata.json
    ├── sample-task.json
    ├── sample-alpha-output.json
    └── sample-yield-output.json
```

---

# 15. Environment variables

## Root `.env.example`

```bash
# App
NEXT_PUBLIC_APP_NAME=SpartArena
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Mantle Sepolia
NEXT_PUBLIC_CHAIN_ID=5003
NEXT_PUBLIC_MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
NEXT_PUBLIC_MANTLE_EXPLORER_URL=https://sepolia.mantlescan.xyz

# Contract addresses
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=
NEXT_PUBLIC_TASK_ESCROW_ADDRESS=
NEXT_PUBLIC_DECISION_LEDGER_ADDRESS=
NEXT_PUBLIC_REPUTATION_ENGINE_ADDRESS=
NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS=

# Backend
API_PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spartarena
REDIS_URL=redis://localhost:6379

# Wallets
DEPLOYER_PRIVATE_KEY=
BACKEND_SIGNER_PRIVATE_KEY=
VERIFIER_PRIVATE_KEY=

# LLM
LLM_PROVIDER=openai
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Notifications
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DISCORD_WEBHOOK_URL=

# Storage
PINATA_JWT=
IPFS_GATEWAY_URL=
```

---

# 16. Recommended API endpoints

## Agents

```txt
GET    /agents
GET    /agents/:id
POST   /agents/sync
POST   /agents/:id/run-demo
```

## Tasks

```txt
GET    /tasks
GET    /tasks/:id
POST   /tasks/sync
POST   /tasks/:id/execute
POST   /tasks/:id/verify
```

## Decisions

```txt
GET    /decisions
GET    /decisions/:id
GET    /agents/:id/decisions
```

## Reputation

```txt
GET    /leaderboard
GET    /agents/:id/reputation
POST   /reputation/recalculate
```

## Demo

```txt
POST   /demo/seed
POST   /demo/run-alpha-agent
POST   /demo/run-yield-agent
GET    /demo/status
```

---

# 17. Agent output schemas

## `AlphaSentinelOutput`

```ts
export type AlphaSentinelOutput = {
  agentName: "AlphaSentinel";
  taskId: number;
  decisionType: "ALPHA_ALERT";
  summary: string;
  evidence: {
    type: "transaction" | "wallet" | "token" | "contract";
    value: string;
    reason: string;
    explorerUrl?: string;
  }[];
  confidence: number;
  riskScore: number;
  recommendedAction: "ignore" | "watchlist" | "alert" | "escalate";
  humanExplanation: string;
};
```

## `YieldStrategistOutput`

```ts
export type YieldStrategistOutput = {
  agentName: "YieldStrategist";
  taskId: number;
  decisionType: "RWA_STRATEGY";
  strategySummary: string;
  assets: {
    symbol: string;
    suggestedWeight: number;
    reason: string;
  }[];
  confidence: number;
  riskScore: number;
  policyWarnings: string[];
  humanExplanation: string;
};
```

## Hashing rule

Before writing to Mantle:

```ts
const promptHash = keccak256(toBytes(JSON.stringify(prompt)));
const outputHash = keccak256(toBytes(JSON.stringify(output)));
const toolsHash = keccak256(toBytes(JSON.stringify(toolCalls)));
```

---

# 18. Demo script

## Title

**SpartArena: Verifiable AI Agent Economy on Mantle**

## Demo story

> “Today, AI agents can claim they are smart. SpartArena makes them prove it. Agents complete paid tasks, write their decisions to Mantle, get scored, and build reputation they can carry across the ecosystem.”

## 2-minute flow

### Scene 1: Landing page

Show:

```txt
SpartArena
The on-chain arena where AI agents earn reputation.
```

### Scene 2: Register agent

Create:

```txt
Name: AlphaSentinel
Skills: Alpha Detection, Wallet Monitoring, Telegram Alerts
Model: GPT/Claude/local
Wallet: 0x...
```

Click:

```txt
Mint Spartan Passport
```

Show Mantle tx.

### Scene 3: Create battle

Create task:

```txt
Detect suspicious wallet activity on Mantle and explain the risk.
Reward: 0.05 MNT
Deadline: 1 hour
```

Click:

```txt
Lock Reward
```

Show escrow tx.

### Scene 4: Run agent

Click:

```txt
Send AlphaSentinel into Arena
```

Show loading animation:

```txt
Reading Mantle activity...
Scoring wallet behavior...
Generating risk summary...
Writing decision proof...
```

### Scene 5: Decision proof

Show:

```txt
Prompt Hash: 0x...
Output Hash: 0x...
Tools Hash: 0x...
Confidence: 82
Risk Score: 64
Mantle Tx: View on Explorer
```

### Scene 6: Reputation update

Show:

```txt
Accuracy: +18
Safety: +20
Speed: +12
Honor: 50
```

### Scene 7: Leaderboard

Show:

```txt
#1 AlphaSentinel
Completed Battles: 1
Honor: 50
Earned: 0.05 MNT
```

End with:

> “SpartArena turns Mantle into the public reputation and settlement layer for autonomous AI agents.”

---

# 19. What to build first

## Priority 1: Contracts

Build and test these first:

```txt
AgentRegistry.sol
TaskEscrow.sol
DecisionLedger.sol
ReputationEngine.sol
```

Do not start with frontend. The hackathon requires real deployment proof.

## Priority 2: One full demo agent

Build only `AlphaSentinelAgent` first.

It should:

```txt
Read task
Generate output
Hash prompt/output/tools
Call DecisionLedger.recordDecision
Call TaskEscrow.submitResult
Call ReputationEngine.submitScore
```

## Priority 3: Judge demo frontend

Build `/demo` before polishing the whole app.

The `/demo` route should make the project look complete even if some secondary pages are thin.

---

# 20. Deployment plan

## Local

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm contracts:test
pnpm contracts:deploy:local
pnpm dev
```

## Mantle Sepolia

```bash
pnpm contracts:deploy:mantle-sepolia
pnpm contracts:verify:mantle-sepolia
pnpm api:deploy
pnpm web:deploy
pnpm demo:seed
```

## Deployment checklist

```txt
Smart contracts deployed on Mantle Sepolia
Contracts verified on explorer
At least one AI-powered function writes on-chain
Frontend publicly accessible
Backend publicly accessible
Demo video recorded
GitHub repo public
README has setup instructions
README has contract addresses
README has architecture diagram
DoraHacks submission includes deployed links
```

This directly targets the deployment award and helps judges trust the project.

---

# 21. README structure

Your `README.md` should look like this:

```md
# SpartArena

The on-chain arena where AI agents fight for jobs, earn rewards, and build verifiable reputation on Mantle.

## Problem

AI agents can claim anything, but users need proof of performance before trusting them with on-chain actions.

## Solution

SpartArena creates a Mantle-native task, payment, and reputation layer for autonomous agents.

## Key Features

- Spartan Passport agent identity
- Battle marketplace
- MNT escrow rewards
- AI decision ledger
- Reputation engine
- Hall of Glory leaderboard
- Byreal skill adapter
- Telegram/Discord alert support

## Architecture

Include diagram.

## Contracts

| Contract | Address |
|---|---|
| AgentRegistry | 0x... |
| TaskEscrow | 0x... |
| DecisionLedger | 0x... |
| ReputationEngine | 0x... |

## Demo

Frontend:
API:
Video:
Explorer links:

## Local Setup

Commands.

## Mantle Sepolia Deployment

Commands.

## Team

Names.
```

---

# 22. How to make it feel like a winner

## The magic phrase

Use this in the pitch:

> **“ERC-8004 gives agents identity. SpartArena gives them work history, payments, and reputation.”**

This is strong because recent ERC-8004 research argues that early blockchain-registered AI agents are still heavily identity-focused and operationally shallow; SpartArena directly addresses that missing operational layer. ([arXiv][4])

## The judge hook

Say:

> “Instead of building one agent, we built the arena where all Mantle agents can prove themselves.”

## The ecosystem hook

Say:

> “Every useful event in SpartArena settles on Mantle: agent registration, task escrow, decision proof, result verification, payment, and reputation.”

## The business hook

Say:

> “Protocols can use SpartArena to benchmark agents. Users can hire agents. Agent builders can monetize performance. Mantle becomes the reputation graph for autonomous finance.”

---

# 23. Final build recommendation

Build **SpartArena** as a narrow but complete product:

```txt
One task marketplace
Two agents max
Four contracts
One backend
One beautiful demo route
One leaderboard
One verified Mantle deployment
```

The win condition is not “most features.”

The win condition is:

```txt
A judge can open the demo,
understand it in 10 seconds,
run an AI agent,
see a Mantle transaction,
see reputation update,
and believe this could become real infrastructure.
```

That is SpartArena.

[1]: https://docs.mantle.xyz/network "Overviews | Network"
[2]: https://docs.mantle.xyz/network/for-developers/quick-access "Quick Access | Network"
[3]: https://docs.byreal.io/byreal-ai-agent/ai-agent-skills "AI Agent Skills | Byreal"
[4]: https://arxiv.org/abs/2606.12128?utm_source=chatgpt.com "From Agent Identity to Agent Economy: Measuring the Operational Readiness of ERC-8004 AI Agents"
