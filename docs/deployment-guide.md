# SpartArena — Deployment Guide

End-to-end deployment for local development and Mantle Sepolia. Every step has a `make` target; run `make help` for the full menu.

## Prerequisites

- **Node 24** and **pnpm 11** (`corepack enable` then `pnpm -v`)
- **Foundry** — `forge`, `anvil`, `cast` (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- **Docker** (for Postgres and Redis)
- A funded deployer wallet (testnet **MNT** for Mantle Sepolia — use a Mantle Sepolia faucet)

## Chain reference

| | Mantle Sepolia | Local |
| --- | --- | --- |
| chainId | `5003` | `31337` |
| RPC | `https://rpc.sepolia.mantle.xyz` | `http://127.0.0.1:8545` |
| Explorer | `https://sepolia.mantlescan.xyz` | — |
| Native token | MNT (18 decimals) | ETH |

## 1. Install and configure

```bash
pnpm install            # make install
cp .env.example .env     # then fill in the values below
```

Minimum env to deploy contracts:

```bash
DEPLOYER_PRIVATE_KEY=0x…           # funds + signs the deploy
BACKEND_SIGNER_ADDRESS=0x…         # optional; authorized as writer (defaults to deployer)
```

> Foundry reads RPC aliases (`localhost`, `mantle_sepolia`) and any verification config from `packages/contracts/foundry.toml`. Ensure the Mantle Sepolia RPC and explorer/verifier settings are present there.

## 2. Local deployment

```bash
make test            # run the Foundry suite (27 tests) — do this first
make anvil           # terminal A: local chain (chainId 31337)
make deploy-local    # terminal B: deploy + seed skills + authorize writer
```

`make deploy-local` runs `Deploy.s.sol`, which:

1. deploys `AgentRegistry`, `TaskEscrow`, `DecisionLedger`, `ReputationEngine`, `SkillRegistry`;
2. authorizes the backend signer as a writer on escrow, ledger, and reputation;
3. seeds the seven canonical skills;
4. writes all addresses to `packages/contracts/deployments/31337.json`.

Copy those addresses into your `.env` (`NEXT_PUBLIC_*_ADDRESS`).

## 3. Run the agent

```bash
make agent-demo            # offline — full pipeline, no chain writes, no API keys
make agent-demo-onchain    # writes proofs to your deployed contracts
```

`agent-demo-onchain` requires `BACKEND_SIGNER_PRIVATE_KEY`, the RPC URL, and the deployed contract addresses in `.env`.

## 4. Database, API, and web

```bash
make db-up                 # Postgres (+ Redis) via docker compose
make db-migrate            # apply Prisma migrations
make db-seed               # load demo data (populates Chronicle + Hall of Glory)
make api                   # Fastify API → http://localhost:4000
make web                   # Next.js   → http://localhost:3000
```

Open **http://localhost:3000/demo**.

## 5. Mantle Sepolia deployment

Fund the deployer with testnet MNT, then:

```bash
make deploy-sepolia        # deploy + verify on Mantle Sepolia (writes deployments/5003.json)
```

This runs `forge script … --rpc-url mantle_sepolia --broadcast --verify --slow`. After it completes:

1. Copy the addresses from `packages/contracts/deployments/5003.json` into `.env` (`NEXT_PUBLIC_*_ADDRESS`).
2. Confirm each contract shows **Verified** on `https://sepolia.mantlescan.xyz`.
3. Set `NEXT_PUBLIC_CHAIN_ID=5003` and the Mantle RPC/explorer env vars.

If verification did not run inline, re-run it:

```bash
make verify-sepolia
```

## 6. Hosting the apps

- **Web → Vercel.** Point at `apps/web`, set the `NEXT_PUBLIC_*` env vars (chain id, RPC, explorer, contract addresses). See `infra/vercel/`.
- **API → Railway.** Point at `apps/api`, set `DATABASE_URL`, `REDIS_URL`, `BACKEND_SIGNER_PRIVATE_KEY`, `VERIFIER_PRIVATE_KEY`, and the chain env. See `infra/railway/`.
- Run `make db-seed` against the production database once so the demo route is populated.

## 7. Deployment checklist

```txt
[ ] Contracts deployed on Mantle Sepolia (5003)
[ ] Contracts verified on the explorer
[ ] Agent writes on-chain (DecisionLedger.recordDecision) confirmed by a real tx
[ ] Frontend publicly accessible
[ ] Backend publicly accessible
[ ] Demo video recorded
[ ] GitHub repo public
[ ] README updated with contract addresses + deployed links
[ ] DoraHacks submission includes the deployed links
```

## Security notes

- **Never commit private keys or API keys.** They belong in `.env` (gitignored) or a secret manager.
- The backend signer is a privileged writer — protect it and use a dedicated key, not the deployer, in production.
- Validate that all required secrets are present at startup; the API and agent runner read config through a typed `env` module and fail fast when required values are missing.
