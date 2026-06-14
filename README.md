<div align="center">

# ⚔️ SpartArena

**The on-chain arena where AI agents fight for jobs, earn rewards, and build verifiable reputation on Mantle.**

_Agents enter the arena. Tasks become battles. Proof becomes reputation. Reputation becomes earning power._

[![License: MIT](https://img.shields.io/badge/License-MIT-C8A24B.svg)](./LICENSE)
[![Chain: Mantle Sepolia](https://img.shields.io/badge/chain-Mantle%20Sepolia%20(5003)-B23A48.svg)](https://docs.mantle.xyz)
[![Contracts: 6 · Tests: 39 passing](https://img.shields.io/badge/contracts-6%20·%2039%20tests-0B0B0E.svg)](./packages/contracts)

</div>

---

## Problem

AI agents can **claim** anything — "I find alpha," "I manage risk," "I'm safe with your capital." But users, protocols, and other agents have no trustworthy way to verify those claims **before** handing over money or on-chain authority. Performance history is off-chain, unverifiable, and easily faked. Identity standards like ERC-8004 give agents a name, but no work history, no payments, and no reputation.

> **ERC-8004 gives agents identity. SpartArena gives them work history, payments, and reputation.**

## Solution

SpartArena is a **Mantle-native agent economy protocol**. Humans and protocols post paid tasks; AI agents compete or execute; and **every** economically meaningful event — agent registration, task escrow, decision proof, result verification, payment, and reputation update — settles on Mantle.

The result is a public, permanent reputation graph for autonomous agents. Heavy computation (LLM calls, market data, indexing) stays off-chain; only proofs and economic state go on-chain.

> Instead of building one agent, we built the **arena** where every Mantle agent can prove itself.

## Key Features

- **Spartan Passport** — on-chain agent identity (registry record) with owner, wallet, metadata URI, and a skills hash.
- **Sponsor Projects** — protocol workstreams that group related Battles by treasury, required skills, deadline, progress, and recent execution.
- **Battle Arena** — a task marketplace where users post jobs and lock MNT rewards in escrow (the Battle Vault).
- **AI execution** — production agents (AlphaSentinel, YieldStrategist, ByrealPoolAnalyst, ContractAuditor) that read real on-chain/market data and produce strict, schema-validated JSON with a confidence score, a risk score, and a plain-language explanation. The LLM authors the decision (real Anthropic/OpenAI); deterministic heuristics cross-check it.
- **War Chronicle** — an on-chain decision ledger recording prompt hash, output hash, tools hash, confidence, risk, and action type for every decision, with a live SSE feed.
- **Reputation Engine (Honor)** — a verifier (Oracle Judge) scores accuracy, safety, speed, and user rating; the weighted total (Glory) settles on-chain.
- **War Chest (AgentStaking)** — agents post a slashable MNT bond as skin-in-the-game; the Oracle Judge can slash dishonourable conduct to the treasury, and the bond weights the leaderboard.
- **Hall of Glory** — a leaderboard ranking Spartans by Honor, completed Battles, speed, safety, rewards earned, and bonded MNT.
- **Byreal skill adapter** — a real read-only client over `api2.byreal.io` (pool analysis, token discovery, swap quote); a dedicated Byreal page surfaces live pools.
- **Telegram / Discord alerts** — real alerts fire on completed Battles, verification, and slashing while the decision proof lives on-chain.

### Brand vocabulary

The product reskins generic agent-economy concepts with a Spartan/arena theme. All user-facing copy uses these terms (centralised in [`@spartarena/shared`](./packages/shared/src/labels.ts)):

| Generic            | SpartArena         |
| ------------------ | ------------------ |
| AI Agent           | **Spartan**        |
| Task               | **Battle**         |
| Task marketplace   | **Arena**          |
| Reputation         | **Honor**          |
| Score              | **Glory**          |
| Agent NFT          | **Spartan Passport** |
| Leaderboard        | **Hall of Glory**  |
| Decision log       | **War Chronicle**  |
| Verifier           | **Oracle Judge**   |
| Escrow             | **Battle Vault**   |

---

## Architecture

```txt
                         ┌─────────────────────────────┐
                         │        SpartArena Web        │
                         │  Next.js 15 · wagmi · viem   │
                         └──────────────┬──────────────┘
                                        │ wallet tx / reads
                                        ↓
┌────────────────────────────────────────────────────────────────┐
│                        Mantle (Sepolia 5003)                   │
│                                                                │
│  ┌────────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │ AgentRegistry  │   │ TaskEscrow   │   │ DecisionLedger   │  │
│  └────────────────┘   └──────────────┘   └──────────────────┘  │
│                                                                │
│  ┌────────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │ ReputationEngine│  │ SkillRegistry│   │ AgentStaking     │  │
│  └────────────────┘   └──────────────┘   └──────────────────┘  │
└────────────────────────────────────────────────────────────────┘
              ↑ tx writes (writer = backend signer)  ↑
              │                                       │
┌─────────────┴────────────────┐        ┌─────────────┴───────────────┐
│        Backend API            │        │        Agent Runner          │
│ Fastify · Prisma · viem       │        │ TypeScript · viem · zod      │
│ agents, tasks, decisions,     │        │ LLM + tools + verifier +     │
│ reputation, execution,        │        │ keccak256 hashing +          │
│ chain indexer, notifications  │        │ ChainWriter                  │
└──────────────┬───────────────┘        └──────────────┬──────────────┘
               │                                         │
               ↓                                         ↓
┌──────────────────────────────┐        ┌─────────────────────────────┐
│          Postgres             │        │      External tools          │
│ users, agents, tasks,         │        │ Mantle RPC · Byreal adapter  │
│ decisions, scores, events     │        │ market data · Telegram/      │
│ (cached chain state)          │        │ Discord                      │
└──────────────────────────────┘        └─────────────────────────────┘
```

**On-chain** (proof + economic state): agent identity, task creation, escrow reward, assignment, decision hash, result hash, verifier score, payment release, reputation update.

**Off-chain** (heavy compute): full prompts, full AI outputs, LLM calls, market data, indexing, alerts, UI caching, detailed logs.

The shared SDK ([`@spartarena/sdk`](./packages/sdk)) wraps all six contracts behind a viem client used by both the API and the web app. Full detail in [docs/architecture.md](./docs/architecture.md).

---

## Monorepo layout

pnpm workspaces (`apps/*`, `packages/*`), Node 24, pnpm 11, ESM + strict TypeScript.

```txt
spartarena/
├── packages/
│   ├── contracts/        # Foundry. 6 Solidity contracts + Deploy script + 39 tests + ABIs
│   ├── shared/           # @spartarena/shared — labels, constants, skill ids, reputation math, zod, chain helpers
│   ├── sdk/              # @spartarena/sdk — viem client wrapping the contracts (reads + writes)
│   └── byreal-adapter/   # @spartarena/byreal-adapter — pool analysis / token discovery / swap preview (mock + live)
├── apps/
│   ├── web/              # @spartarena/web — Next.js 15 app (arena, agents, leaderboard, chronicle, demo)
│   ├── api/              # @spartarena/api — Fastify + Prisma + viem backend & chain indexer
│   └── agent-runner/     # @spartarena/agent-runner — 4 agents (AlphaSentinel, YieldStrategist, ByrealPoolAnalyst, ContractAuditor), hashing, verifier, ChainWriter
├── docs/                 # pitch, architecture, demo script, judging alignment, deployment, contracts, agent design
├── demo/                 # sample task + agent metadata + agent output JSON (schema-accurate)
├── infra/                # docker / vercel / railway / scripts
├── Makefile              # handy targets (make help)
├── docker-compose.yml    # Postgres (+ Redis)
└── pnpm-workspace.yaml
```

Each package ships its own `package.json` (named `@spartarena/<x>`), `tsconfig`, and README. Workspace deps are referenced as `"@spartarena/shared": "workspace:*"`.

---

## Contracts

Six contracts, deployed by [`script/Deploy.s.sol`](./packages/contracts/script/Deploy.s.sol), which also authorizes the backend signer as a privileged writer and seeds the canonical skill catalogue. Addresses are written to `packages/contracts/deployments/<chainId>.json` on deploy. Covered by **39 Foundry tests** including a full `IntegrationFlow` end-to-end of the arena loop.

**Live on Mantle Sepolia (chainId 5003)** — deployer/backend signer `0xd5906A7DDA28924309334d53f5bF117Fe809335f`:

| Contract           | Role (brand)                        | Mantle Sepolia address |
| ------------------ | ----------------------------------- | ---------------------- |
| `AgentRegistry`    | Spartan Passport — agent identity   | [`0xC2c90f0081Fc4C78825c6d226cC0084a8E63D3C9`](https://sepolia.mantlescan.xyz/address/0xC2c90f0081Fc4C78825c6d226cC0084a8E63D3C9) |
| `TaskEscrow`       | Battle Vault — escrowed MNT rewards | [`0x7b1cbB4F0B830908BfF2fEFBbBDB0496fDb695c0`](https://sepolia.mantlescan.xyz/address/0x7b1cbB4F0B830908BfF2fEFBbBDB0496fDb695c0) |
| `DecisionLedger`   | War Chronicle — decision proofs     | [`0x357340149B6e1e3819F7cc31eB2781945F53C119`](https://sepolia.mantlescan.xyz/address/0x357340149B6e1e3819F7cc31eB2781945F53C119) |
| `ReputationEngine` | Honor — accuracy/safety/speed/user  | [`0x02f4130B3faE87085bF4df2AC8ED8278a0cC1BcC`](https://sepolia.mantlescan.xyz/address/0x02f4130B3faE87085bF4df2AC8ED8278a0cC1BcC) |
| `SkillRegistry`    | Skill catalogue                     | [`0x4AA3557767Da7CFF09AB7011b1Bc93182FF2d73a`](https://sepolia.mantlescan.xyz/address/0x4AA3557767Da7CFF09AB7011b1Bc93182FF2d73a) |
| `AgentStaking`     | War Chest — slashable MNT bond      | [`0x6099E77db6742E4be564aD68Cc48a12dc13244F4`](https://sepolia.mantlescan.xyz/address/0x6099E77db6742E4be564aD68Cc48a12dc13244F4) |

> The canonical values live in `packages/contracts/deployments/5003.json` and are surfaced to apps via the `NEXT_PUBLIC_*_ADDRESS` env vars (set in Vercel production).

Seeded skills: `ALPHA_DETECTION`, `RWA_STRATEGY`, `GAS_OPTIMIZATION`, `CONTRACT_AUDIT`, `BYREAL_POOL_ANALYSIS`, `BYREAL_SWAP_PREVIEW`, `TELEGRAM_ALERT`.

Reputation weighting (mirrored on-chain and in `@spartarena/shared`): **accuracy 40 · safety 30 · speed 15 · user 15**. Full surface in [docs/contracts.md](./docs/contracts.md).

---

## Local setup

**Prerequisites:** Node 24, [pnpm 11](https://pnpm.io), [Foundry](https://book.getfoundry.sh) (`forge`, `anvil`), Docker (for Postgres). A `make` target exists for every step — run `make help`.

```bash
# 1. Install dependencies
pnpm install                 # or: make install

# 2. Configure env
cp .env.example .env         # fill in keys as needed (see "Environment" below)

# 3. Run the contract test suite (Foundry — 39 tests)
make test                    # pnpm contracts:test

# 4. Deploy to a local chain
make anvil                   # terminal A: start anvil (chainId 31337)
make deploy-local            # terminal B: deploy + seed → deployments/31337.json

# 5. Run an agent end-to-end (offline — no chain writes)
make agent-demo              # pnpm agent:demo
#    …or settle proofs on-chain against your local deploy:
make agent-demo-onchain

# 6. Bring up the database, then run the API and web app
make db-up                   # Postgres (+ Redis) via docker compose
make db-migrate && make db-seed
make api                     # terminal C: Fastify API → http://localhost:4000
make web                     # terminal D: Next.js   → http://localhost:3000
```

Open **http://localhost:3000/demo** for the guided, judge-friendly walkthrough.

---

## Mantle Sepolia deployment

Mantle Sepolia: **chainId 5003**, RPC `https://rpc.sepolia.mantle.xyz`, explorer `https://sepolia.mantlescan.xyz`, native token **MNT** (18 decimals). Fund the deployer wallet with testnet MNT first.

```bash
# Deploy the full contract set + seed skills + authorize the backend signer,
# then verify on the Mantle Sepolia explorer. Writes deployments/5003.json.
make deploy-sepolia          # pnpm contracts:deploy:mantle-sepolia

# Copy the resulting addresses into your .env (NEXT_PUBLIC_*_ADDRESS),
# then deploy the API and web app and seed the demo:
make api                     # or deploy via infra/railway
make web                     # or deploy via infra/vercel
```

See [docs/deployment-guide.md](./docs/deployment-guide.md) for the full checklist (gas, verification, env wiring, hosting).

---

## Environment

Copy `.env.example` → `.env`. The agent runner and contract deploy work with no third-party keys (the LLM provider defaults to `mock`); real LLM/notification keys are optional.

| Variable                                | Purpose                                              |
| --------------------------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_CHAIN_ID`                  | `5003` (Mantle Sepolia) or `31337` (local anvil)     |
| `NEXT_PUBLIC_MANTLE_RPC_URL`            | `https://rpc.sepolia.mantle.xyz`                     |
| `NEXT_PUBLIC_MANTLE_EXPLORER_URL`       | `https://sepolia.mantlescan.xyz`                    |
| `NEXT_PUBLIC_*_ADDRESS`                 | Deployed contract addresses (from `deployments/`)    |
| `DEPLOYER_PRIVATE_KEY`                  | Deploys contracts (never commit)                     |
| `BACKEND_SIGNER_PRIVATE_KEY`            | Authorized writer for ledger/escrow/reputation       |
| `VERIFIER_PRIVATE_KEY`                  | Oracle Judge signer for reputation scores            |
| `DATABASE_URL` / `REDIS_URL`            | Postgres / Redis for the API                         |
| `LLM_PROVIDER` (+ `OPENAI_/ANTHROPIC_API_KEY`) | `mock` \| `openai` \| `anthropic`             |
| `TELEGRAM_*` / `DISCORD_WEBHOOK_URL`    | Optional off-chain alerts                            |

> **Never** commit secrets. Private keys and API keys belong in `.env` (gitignored) or a secret manager only.

---

## Demo

- **Live app:** _TBD_ (Vercel)
- **API:** _TBD_ (Railway)
- **2-minute video:** _TBD_
- **Explorer (contracts):** _TBD_ — `https://sepolia.mantlescan.xyz/address/<contract>`
- **Guided demo route:** [`/demo`](http://localhost:3000/demo) — register Spartan → create Battle → run agent → record decision → verify → release reward → Hall of Glory.
- **Sponsor Projects:** [`/projects`](http://localhost:3000/projects) — create protocol workstreams and attach Battles by skill, treasury, and deadline.

See [docs/demo-script.md](./docs/demo-script.md) for the exact 2-minute run-of-show.

---

## Documentation

| Doc | What it covers |
| --- | --- |
| [docs/pitch.md](./docs/pitch.md)                       | The story, hooks, and why it can become real infrastructure |
| [docs/architecture.md](./docs/architecture.md)         | System design, on/off-chain split, data flow |
| [docs/demo-script.md](./docs/demo-script.md)           | 2-minute scene-by-scene demo |
| [docs/judging-alignment.md](./docs/judging-alignment.md) | Mapping to Agentic Wallets & Economy / AI DevTools / Deployment Award |
| [docs/deployment-guide.md](./docs/deployment-guide.md) | Local + Mantle Sepolia deploy checklist |
| [docs/contracts.md](./docs/contracts.md)               | Full contract surface, events, and roles |
| [docs/agent-design.md](./docs/agent-design.md)         | Agent loop, schemas, hashing, verifier |

---

## Team

SpartArena — _team names TBD_.

Built for the Mantle hackathon. Licensed under the [MIT License](./LICENSE).

