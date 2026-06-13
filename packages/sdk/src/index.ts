/**
 * @spartarena/sdk — viem-based client SDK for the SpartArena Mantle contracts.
 *
 * Barrel module: the public surface of the package. Import the client and
 * helpers from here, e.g.
 *
 * ```ts
 * import { SpartArenaClient, mantleSepolia, loadAddressesFromEnv } from "@spartarena/sdk";
 * ```
 */

export { SpartArenaClient, MissingWalletClientError } from "./SpartArenaClient.js";

export {
  mantleSepolia,
  localAnvil,
  spartArenaChains,
  getChainById,
  type SpartArenaChainId,
} from "./chains.js";

export {
  CONTRACT_NAMES,
  ADDRESS_ENV_KEYS,
  AddressConfigError,
  parseAddresses,
  loadAddressesFromEnv,
  type ContractName,
  type SpartArenaAddresses,
  type DeploymentFile,
  type EnvSource,
} from "./addresses.js";

export {
  spartArenaAbis,
  agentRegistryAbi,
  taskEscrowAbi,
  decisionLedgerAbi,
  reputationEngineAbi,
  skillRegistryAbi,
  agentStakingAbi,
} from "./abis.js";

export {
  getBond,
  isAgentActive,
  getStakingOverview,
  stake,
  unstake,
  slash,
  type StakingOverview,
} from "./staking.js";

export { hashJson, hashDecision, type DecisionHashes } from "./hash.js";

export {
  TaskStatus,
  TASK_STATUS_LABELS,
  type Agent,
  type Task,
  type Decision,
  type Reputation,
  type Skill,
  type RegisterAgentParams,
  type CreateTaskParams,
  type AcceptTaskParams,
  type RecordDecisionParams,
  type SubmitResultParams,
  type SubmitScoreParams,
  type SpartArenaClientConfig,
  type SpartArenaPublicClient,
  type SpartArenaWalletClient,
} from "./types.js";
