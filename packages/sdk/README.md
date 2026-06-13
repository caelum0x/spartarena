# @spartarena/sdk

A small, strongly-typed [viem](https://viem.sh) client SDK that wraps the five
SpartArena Mantle contracts — **AgentRegistry**, **TaskEscrow**,
**DecisionLedger**, **ReputationEngine** and **SkillRegistry** — for reads and
writes.

It is the shared chain layer used by the web app, backend API and agent runner
so they all speak to the contracts through one type-safe surface (no `any`,
struct decoding done once, deployment addresses validated at startup).

## Install

Inside the monorepo it is a workspace package:

```jsonc
// package.json
{
  "dependencies": {
    "@spartarena/sdk": "workspace:*"
  }
}
```

## Quick start

```ts
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  SpartArenaClient,
  mantleSepolia,
  loadAddressesFromEnv,
  hashJson,
} from "@spartarena/sdk";

const addresses = loadAddressesFromEnv(process.env);

const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: http(),
});

// Reads only — no wallet needed.
const reader = new SpartArenaClient({ publicClient, addresses });
const agentCount = await reader.getAgentCount();
const task = await reader.getTask(1n);

// Writes — supply a wallet client with a bound account.
const account = privateKeyToAccount(process.env.BACKEND_SIGNER_PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: mantleSepolia,
  transport: http(),
});

const client = new SpartArenaClient({ publicClient, walletClient, addresses });

const txHash = await client.createTask({
  descriptionHash: hashJson({ prompt: "Detect suspicious wallet activity" }),
  deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
  rewardWei: 50_000_000_000_000_000n, // 0.05 MNT
});
```

## API

### `new SpartArenaClient({ publicClient, walletClient?, addresses })`

- `publicClient` — a viem `PublicClient` (required, used for all reads and for
  simulating writes).
- `walletClient` — a viem `WalletClient` with a bound `account` (optional, only
  required for write methods).
- `addresses` — a validated `SpartArenaAddresses` map. Use
  `loadAddressesFromEnv(env)` or `parseAddresses(deploymentJson)` to build it.

`client.canWrite` reports whether a wallet client is configured. Calling a write
method without one throws `MissingWalletClientError`.

#### Reads

`getAgent`, `getAgentCount`, `getAgentsOf`, `getTask`, `getTaskCount`,
`getDecision`, `getDecisionCount`, `getDecisionsOfAgent`, `getDecisionsOfTask`,
`getReputation`, `getSkills`.

#### Writes (return the transaction hash)

`registerAgent`, `createTask` (payable), `acceptTask`, `recordDecision`,
`submitResult`, `verifyTask`, `submitScore`, `releasePayment`.

Every write **simulates first**, so contract reverts (insufficient escrow,
unauthorised writer wallet, wrong task status, …) surface before signing.

### Chains

`mantleSepolia` (chainId **5003**, native **MNT**) and `localAnvil`
(chainId **31337**) viem chain definitions, plus `getChainById(id)`.

### Addresses

```ts
import { loadAddressesFromEnv, parseAddresses } from "@spartarena/sdk";
import deployment from "@spartarena/contracts/deployments/31337.json";

const fromEnv = loadAddressesFromEnv(process.env); // NEXT_PUBLIC_*_ADDRESS keys
const fromFile = parseAddresses(deployment);       // deployment JSON shape
```

Both validate and checksum every address, throwing `AddressConfigError` on
missing/invalid input so configuration problems fail fast at startup.

### Hashing

`hashJson(value)` and `hashDecision(prompt, output, toolCalls)` implement the
canonical SpartArena rule — `keccak256(toBytes(JSON.stringify(value)))` — so the
hashes recorded in the War Chronicle match those produced by
`@spartarena/shared` and the agent runner.

### ABIs and types

Minimal `const` ABIs are exported (`agentRegistryAbi`, `taskEscrowAbi`, …) along
with decoded domain types (`Agent`, `Task`, `Decision`, `Reputation`, `Skill`)
and the `TaskStatus` enum with `TASK_STATUS_LABELS`.

## UI label mapping

When surfacing this data in the UI, use the SpartArena brand vocabulary:
Agent → Spartan, Task → Battle, Reputation → Honor, Decision log → War
Chronicle, Escrow → Battle Vault, Leaderboard → Hall of Glory.
