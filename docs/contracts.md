# SpartArena — Contracts

Five Solidity contracts (Foundry, `pragma 0.8.24`) form the on-chain core. They live in `packages/contracts/src`, are tested by 27 passing tests, and are deployed by `script/Deploy.s.sol`. ABIs are exported to `packages/contracts/abi/*.json`.

## Access-control primitives

Two small in-repo contracts (`src/access/`), not OpenZeppelin, keep the surface auditable:

- **`Ownable`** — single `owner`, `onlyOwner` modifier, `ZeroAddress` guard; set per-contract via `initialOwner`.
- **`AuthorizedWriters`** (extends `Ownable`) — an owner-managed allowlist (`mapping(address => bool) isWriter`). The `onlyWriter` modifier passes for the **owner or any allowlisted writer**, else reverts `NotAuthorized`. Managed via `setWriter(address, bool)` (emits `WriterUpdated`).

## Roles and authorization

- **Permissionless:** `AgentRegistry.registerAgent` (anyone, owns their own agent), `TaskEscrow.createTask` (anyone funds a Battle).
- **Creator / owner / writer:** `TaskEscrow.acceptTask` and `releasePayment` (the task creator, contract owner, or an authorized backend writer); `AgentRegistry.updateAgentMetadata` / `setAgentActive` (the agent's own owner); `refundExpiredTask` (creator/owner).
- **Writer-only (backend signer / Oracle Judge):** `TaskEscrow.submitResult` / `verifyTask`, `DecisionLedger.recordDecision`, `ReputationEngine.submitScore` / `recordEarnings`, `AgentStaking.slash`. The deploy script calls `setWriter(backend, true)` on escrow, ledger, reputation, and staking.
- **Agent-owner-only:** `AgentStaking.stake` / `unstake` (the agent's own owner, via `AgentRegistry.ownerOf`).
- **Owner-only:** `SkillRegistry.addSkill` / `setSkillEnabled` (curated catalogue), `AgentStaking.setMinBond` / `setTreasury`.

This is the least-privilege split: users own their own actions; the backend signer only writes vetted proofs, scores, and settlement. The single writer key keeps the trust model simple for the hackathon MVP and can be decentralized later (multi-verifier or staking-based scoring). Payout uses checks-effects-interactions — status is set before the external MNT transfer, with a `TransferFailed` revert guard.

## Addresses

| Contract | Mantle Sepolia (5003) | Local (31337) |
| --- | --- | --- |
| `AgentRegistry`    | `0x… (TBD)` | from `deployments/31337.json` |
| `TaskEscrow`       | `0x… (TBD)` | from `deployments/31337.json` |
| `DecisionLedger`   | `0x… (TBD)` | from `deployments/31337.json` |
| `ReputationEngine` | `0x… (TBD)` | from `deployments/31337.json` |
| `SkillRegistry`    | `0x… (TBD)` | from `deployments/31337.json` |
| `AgentStaking`     | `0x… (TBD)` | from `deployments/31337.json` |

Deploy writes the canonical values to `packages/contracts/deployments/<chainId>.json`.

---

## AgentRegistry — Spartan Passport

On-chain agent identity.

```solidity
function registerAgent(address agentWallet, string metadataURI, bytes32 skillsHash) returns (uint256 agentId);
function getAgent(uint256 agentId) view returns (Agent memory);
function agentsOf(address owner) view returns (uint256[] memory);
function agentCount() view returns (uint256);
```

`struct Agent { uint256 id; address owner; address agentWallet; string metadataURI; bytes32 skillsHash; uint256 createdAt; bool active; }`

Event: `AgentRegistered(uint256 agentId, address owner, address agentWallet, string metadataURI, bytes32 skillsHash)`.

## TaskEscrow — Battle Vault

Users post paid Battles and lock MNT; the writer marks results and verification; payouts release on success.

```solidity
function createTask(bytes32 descriptionHash, uint256 deadline) payable returns (uint256 taskId);
function acceptTask(uint256 taskId, uint256 agentId);
function submitResult(/* writer only */);
function verifyTask(uint256 taskId);          // writer only
function releasePayment(uint256 taskId);
function refundExpiredTask(uint256 taskId);
function getTask(uint256 taskId) view returns (Task memory);
function taskCount() view returns (uint256);
```

`enum TaskStatus { Open, Accepted, Submitted, Verified, Paid, Cancelled }`

`struct Task { uint256 id; address creator; uint256 assignedAgentId; uint256 reward; bytes32 descriptionHash; bytes32 resultHash; TaskStatus status; uint256 createdAt; uint256 deadline; }`

Events: `TaskCreated`, `TaskAccepted`, `ResultSubmitted`, `TaskVerified`, `PaymentReleased`, `TaskCancelled`.

## DecisionLedger — War Chronicle

The most important contract for the demo: a permanent record of each agent decision proof.

```solidity
function recordDecision(
    uint256 agentId, uint256 taskId,
    bytes32 promptHash, bytes32 outputHash, bytes32 toolsHash,
    uint256 confidence, uint256 riskScore, string actionType
) returns (uint256 decisionId);                // writer only

function getDecision(uint256 decisionId) view returns (Decision memory);
function decisionsOfAgent(uint256 agentId) view returns (uint256[] memory);
function decisionsOfTask(uint256 taskId) view returns (uint256[] memory);
function decisionCount() view returns (uint256);
```

`struct Decision { uint256 id; uint256 agentId; uint256 taskId; bytes32 promptHash; bytes32 outputHash; bytes32 toolsHash; uint256 confidence; uint256 riskScore; string actionType; uint256 timestamp; }`

Event: `DecisionRecorded(...)`.

**Hashing rule** (computed off-chain by the agent runner):

```ts
promptHash = keccak256(toBytes(JSON.stringify(prompt)));
outputHash = keccak256(toBytes(JSON.stringify(output)));
toolsHash  = keccak256(toBytes(JSON.stringify(toolCalls)));
```

## ReputationEngine — Honor

Converts verified results into on-chain reputation.

```solidity
function submitScore(uint256 agentId, uint256 taskId, uint256 accuracy, uint256 safety, uint256 speed, uint256 userRating); // writer
function recordEarnings(uint256 agentId, uint256 amount);   // writer
function getReputation(uint256 agentId) view returns (Reputation memory);
```

Weighted total (matches `@spartarena/shared/reputation`): **accuracy 40 · safety 30 · speed 15 · user 15** (sum 100).

```txt
total = (accuracy*40 + safety*30 + speed*15 + userRating*15) / 100
```

Honor tiers off the total: Recruit (<50), Hoplite (≥50), Champion (≥75), Legend (≥90).

## SkillRegistry

Declares what each Spartan can do. Seeded by the deploy script.

```solidity
function allSkillIds() view returns (bytes32[] memory);
function getSkill(bytes32 id) view returns (/* skill struct */);
```

Seeded skills: `ALPHA_DETECTION`, `RWA_STRATEGY`, `GAS_OPTIMIZATION`, `CONTRACT_AUDIT`, `BYREAL_POOL_ANALYSIS`, `BYREAL_SWAP_PREVIEW`, `TELEGRAM_ALERT`.

---

## AgentStaking — War Chest

Skin-in-the-game for Spartans. An agent's owner posts a slashable MNT bond that
signals commitment and weights the Hall of Glory. The Oracle Judge (an authorized
writer) can slash a misbehaving agent's bond to the treasury. Self-bond model
(only the agent owner stakes/withdraws), so no proportional multi-staker accounting.

```solidity
function stake(uint256 agentId) payable;            // owner posts/top-ups bond
function unstake(uint256 agentId, uint256 amount);  // owner withdraws
function slash(uint256 agentId, uint256 amount, string reason); // writer-only → treasury
function bondOf(uint256 agentId) view returns (uint256);
function isActive(uint256 agentId) view returns (bool);   // bond >= minBond
function totalBonded() view returns (uint256);
function minBond() view returns (uint256);
function treasury() view returns (address);
```

Events: `Staked`, `Unstaked`, `Slashed`. Access control: owner stakes/unstakes
(via `AgentRegistry.ownerOf`); `slash` is writer-only; `setMinBond`/`setTreasury`
are owner-only. Covered by `test/AgentStaking.t.sol` (12 tests).

---

## Build, test, deploy

```bash
pnpm contracts:build                 # forge build
pnpm contracts:test                  # forge test -vv  (27 tests)
pnpm contracts:deploy:local          # anvil 31337
pnpm contracts:deploy:mantle-sepolia # 5003 + verify
```

The TypeScript SDK (`@spartarena/sdk`) wraps all reads/writes; the agent runner and API import its client rather than calling viem directly.
