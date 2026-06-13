# @spartarena/byreal-adapter

A clean, strictly-typed adapter that exposes [Byreal](https://byreal.io) skills to SpartArena.

> **Byreal is a SOLANA DEX.** This package is **read/quote-only**: it lists pools and tokens, fetches pool details and mint prices, and previews swap quotes against the **real** Byreal REST API. Live LP execution (opening/adjusting/closing positions) requires signing a **Solana** transaction and is **out of scope** here — see [Solana reality](#solana-reality--out-of-scope).

It wraps four skills behind one stable interface:

| Method | Byreal endpoint | Skill id | Real? |
| --- | --- | --- | --- |
| `analyzePool` | `GET /byreal/api/dex/v2/pools/details` (+ `/pools/info/list`) | `BYREAL_POOL_ANALYSIS` | yes |
| `discoverToken` | `GET /byreal/api/dex/v2/mint/list` (+ `/mint/price`) | `BYREAL_TOKEN_DISCOVERY` | yes |
| `previewSwap` | `POST /byreal/api/router/v1/router-service/swap` (no `userPublicKey` → preview) | `BYREAL_SWAP_PREVIEW` | yes |
| `managePosition` | `GET /byreal/api/dex/v2/position/list` (READ ONLY) | `BYREAL_POSITION_MANAGEMENT` | read-only |

## Default = REAL

`createByrealAdapter()` returns the **real** `LiveByrealAdapter` (hits `BYREAL_API_URL`, default `https://api2.byreal.io`) by default. The deterministic offline `MockByrealAdapter` is used **only** when `BYREAL_MOCK=true` (or `mode: "mock"`), for tests/demos without network access.

```ts
import { createByrealAdapter } from "@spartarena/byreal-adapter";

// REAL client by default (no auth needed for reads/quotes).
const byreal = createByrealAdapter({ recordedOnMantle: true });

const pool = await byreal.analyzePool({
  chain: "solana",
  poolAddress: "<byreal pool address (base58)>",
});

const tokens = await byreal.discoverToken({ query: "USDC", limit: 5 });

const quote = await byreal.previewSwap({
  chain: "solana",
  tokenIn: "So11111111111111111111111111111111111111112",  // SOL
  tokenOut: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  amountIn: "1.5",
  slippageBps: 50,
});

// READ-ONLY: pass the Solana owner public key via `positionId`.
const position = await byreal.managePosition({
  chain: "solana",
  positionId: "<owner solana public key>",
  poolAddress: "<byreal pool address>",
  action: "open", // mutations are reported as out-of-scope; state is read-only
});
```

### Use the mock (offline)

```bash
BYREAL_MOCK=true   # any of: 1|true|yes|on
```

```ts
const byreal = createByrealAdapter({ mode: "mock" });
```

## REST client

`ByrealRestClient` is exported directly for callers that want raw, validated data:

```ts
import { ByrealRestClient } from "@spartarena/byreal-adapter";

const client = new ByrealRestClient({ timeoutMs: 15_000, maxRetries: 2 });
const pools = await client.listPools({ sortField: "tvl", sortType: "desc", pageSize: 20 });
const details = await client.getPoolDetails(pools[0].poolAddress);
const mints = await client.listMints({ searchKey: "USDC" });
const prices = await client.getMintPrices([mints[0].address]);
const quote = await client.getSwapQuote({
  inputMint, outputMint, amount: "1000000", swapMode: "in", slippageBps: "50",
});
const positions = await client.listPositions("<owner solana public key>");
```

The client uses native `fetch` with:

- **Timeouts** via `AbortController` (default 15s).
- **Retries** with exponential backoff + jitter on `429` and `5xx` / network errors (default 2 retries).
- **Zod validation** of every response. Byreal **money fields are STRINGS** to preserve precision; they are kept as strings and parsed to numbers only at the adapter boundary.
- **No secrets** — reads/quotes need no auth.

## Proof envelope

Every result includes a `proof` object so each tool invocation is tamper-evident and independently verifiable. For the **live** adapter, `toolProofHash` is the keccak256 (via viem) of the **real** response-derived result body:

```ts
proof: {
  skill: "BYREAL_POOL_ANALYSIS",
  label: "Byreal Pool Analysis",
  toolProofHash: "0x…",      // keccak256(JSON.stringify(resultBody)) via viem
  recordedOnMantle: boolean, // true once the hash is written to DecisionLedger
  source: "live",            // "live" (real) | "mock"
}
```

The hash uses the same canonical rule as the rest of SpartArena — `keccak256(toBytes(JSON.stringify(value)))` — so the frontend, backend and agent-runner all derive identical hashes for the same payload. SpartArena settles these proofs on **Mantle**, even though the underlying data is read from Byreal on **Solana**.

## Solana reality / out of scope

Byreal runs on **Solana**, so:

- Pool and token addresses are **base58** (e.g. SOL `So111…112`, USDC `EPjFW…Dt1v`), not EVM `0x` hex. The schemas accept either.
- Swap **previews** are real (we omit `userPublicKey`, so the router returns a non-executable quote). Actual swaps and **all LP mutations** (open/increase/decrease/close/rebalance) require signing a Solana transaction and are **not** performed here. `managePosition` reads the live position list and clearly marks any mutation request as out-of-scope.
- For live LP execution, use the official tooling:
  - npm CLI: [`@byreal-io/byreal-cli`](https://www.npmjs.com/package/@byreal-io/byreal-cli)
  - CLMM SDK: `byreal-clmm-sdk` (`byreal-git/byreal-clmm-sdk`) for concentrated-liquidity position management.

## Environment

| Var | Default | Purpose |
| --- | --- | --- |
| `BYREAL_API_URL` | `https://api2.byreal.io` | Byreal REST base URL (no auth for reads/quotes). |
| `BYREAL_MOCK` | _(unset)_ | `true\|1\|yes\|on` → use offline mock instead of the real client. |

See [`.env.example`](./.env.example).

## API

- `createByrealAdapter(options?)` — factory; returns the **real** `LiveByrealAdapter` by default. `mode: "mock"` or `BYREAL_MOCK=true` returns the mock.
- `LiveByrealAdapter` — real REST-backed implementation.
- `MockByrealAdapter` — deterministic offline implementation.
- `ByrealRestClient` — raw, validated Byreal REST client.
- `ByrealSkillAdapter` — the interface all implementations satisfy.
- Zod schemas + inferred types for every input/result in [`src/types.ts`](./src/types.ts) and REST shapes in [`src/rest.ts`](./src/rest.ts).
- `hashJson`, `SKILL_LABELS` — proof helpers re-exported for callers that hash externally.

## Scripts

```bash
pnpm build       # tsc --noEmit (strict)
pnpm typecheck   # tsc --noEmit (strict)
```

## Files

```txt
src/
├── index.ts              # interface + createByrealAdapter factory + re-exports
├── rest.ts               # ByrealRestClient (REAL Solana REST API, zod-validated)
├── live.ts               # LiveByrealAdapter (maps skills → REST client)
├── mock.ts               # MockByrealAdapter (offline, BYREAL_MOCK=true)
├── types.ts              # zod schemas + inferred types (input/result + proof)
└── skills/
    ├── proof.ts          # keccak256 hashing, seeding, deterministic PRNG, labels
    ├── analyzePool.ts    # pure analyzePoolMock
    ├── discoverToken.ts  # pure discoverTokenMock
    ├── previewSwap.ts    # pure previewSwapMock
    └── managePosition.ts # pure managePositionMock
```
