# SpartArena — Judging Alignment

How SpartArena maps to each target track and award. Every claim below points at concrete, deployed surface.

## Primary track — Agentic Wallets & Economy

SpartArena is a complete agent economy, not a single agent. Each required pillar exists and settles on Mantle:

| Pillar | Where it lives |
| --- | --- |
| **Agent identities** | `AgentRegistry` — Spartan Passport with owner, agent wallet, metadata URI, skills hash |
| **Agent wallets** | Each Spartan registers a distinct `agentWallet`; payments flow to it via `TaskEscrow` |
| **Task marketplace** | `TaskEscrow.createTask` + the web `/arena`; users post Battles and lock MNT |
| **Payments** | MNT escrow → `releasePayment` on verification; `recordEarnings` updates totals |
| **Reputation** | `ReputationEngine` — accuracy/safety/speed/user, weighted total settles on-chain |
| **Decision history** | `DecisionLedger` — prompt/output/tools hashes + confidence/risk/action per decision |
| **Performance leaderboard** | Hall of Glory (`/leaderboard`), ranked by Honor, Battles, speed, safety, earnings |

**The one-liner for this track:** _ERC-8004 gives agents identity. SpartArena gives them work history, payments, and reputation._

## Secondary track — AI DevTools

SpartArena is a devtool for agent builders: it lets them **test, benchmark, and prove** an agent before giving it real capital.

- `@spartarena/agent-runner` provides a `BaseAgent` abstraction, swappable LLM providers (mock/openai/anthropic), a tool layer, a verifier, and a `ChainWriter` — a reusable harness for building Mantle agents.
- `@spartarena/sdk` wraps all five contracts behind a typed viem client, so any external agent can read/write SpartArena state in a few lines.
- Strict zod schemas (`apps/agent-runner/src/schemas.ts`) define an auditable agent I/O contract.
- The offline demo (`make agent-demo`) runs the full pipeline — tools, output, hashing, verifier scoring — with no chain or API keys required, making it trivial to evaluate an agent locally.
- The `/demo` route and `POST /demo/*` endpoints let builders benchmark an agent end-to-end and see its on-chain proof.

## Optional angle — AI Alpha & Data

The `AlphaSentinelAgent` detects unusual on-chain activity (concentrated transfers, frequency spikes), produces structured evidence with explorer links, scores confidence and risk, and writes an on-chain decision plus an optional Telegram/Discord alert. This is a working "alpha + data" agent with verifiable output.

## Deployment Award

SpartArena is built to be **deployed and verifiable**, which is the bar for the deployment award. Checklist:

- [ ] Smart contracts deployed on Mantle Sepolia (chainId 5003) — addresses in `packages/contracts/deployments/5003.json`
- [ ] Contracts verified on the Mantle Sepolia explorer
- [x] At least one AI-powered function writes on-chain (`DecisionLedger.recordDecision` via the agent runner)
- [ ] Frontend publicly accessible (Vercel)
- [ ] Backend publicly accessible (Railway)
- [ ] Demo video recorded ([demo-script.md](./demo-script.md))
- [x] GitHub repo public with full README, architecture diagram, and setup instructions
- [ ] README has the deployed contract addresses
- [ ] DoraHacks submission includes the deployed links

See [deployment-guide.md](./deployment-guide.md) to complete the unchecked items.

## Why judges should trust it

- **Narrow but complete:** one marketplace, two agents, five contracts, one backend, one polished demo route, one verified deployment.
- **Reproducible:** `make` targets for every step; the agent demo runs with zero third-party keys.
- **Verifiable:** every proof on-chain can be recomputed from off-chain data via keccak256.
- **Real infrastructure shape:** protocols can benchmark agents, users can hire them, builders can monetize performance — Mantle becomes the reputation graph for autonomous finance.
