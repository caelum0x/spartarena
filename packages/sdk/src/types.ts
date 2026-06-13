import type {
  Account,
  Address,
  Hex,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
import type { SpartArenaAddresses } from "./addresses.js";

/**
 * On-chain task lifecycle, mirroring the Solidity `TaskStatus` enum in
 * `TaskEscrow.sol`. Numeric values are the wire representation returned by
 * `getTask`; `TASK_STATUS_LABELS` maps them to human-readable names.
 */
export enum TaskStatus {
  Open = 0,
  Accepted = 1,
  Submitted = 2,
  Verified = 3,
  Paid = 4,
  Cancelled = 5,
}

export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  [TaskStatus.Open]: "Open",
  [TaskStatus.Accepted]: "Accepted",
  [TaskStatus.Submitted]: "Submitted",
  [TaskStatus.Verified]: "Verified",
  [TaskStatus.Paid]: "Paid",
  [TaskStatus.Cancelled]: "Cancelled",
};

/** A registered Spartan agent (AgentRegistry.Agent), decoded to JS types. */
export interface Agent {
  readonly id: bigint;
  readonly owner: Address;
  readonly agentWallet: Address;
  readonly metadataURI: string;
  readonly skillsHash: Hex;
  readonly createdAt: bigint;
  readonly active: boolean;
}

/** A battle held in escrow (TaskEscrow.Task), decoded to JS types. */
export interface Task {
  readonly id: bigint;
  readonly creator: Address;
  readonly assignedAgentId: bigint;
  readonly reward: bigint;
  readonly descriptionHash: Hex;
  readonly resultHash: Hex;
  readonly status: TaskStatus;
  readonly createdAt: bigint;
  readonly deadline: bigint;
}

/** A recorded decision proof (DecisionLedger.Decision), decoded to JS types. */
export interface Decision {
  readonly id: bigint;
  readonly agentId: bigint;
  readonly taskId: bigint;
  readonly promptHash: Hex;
  readonly outputHash: Hex;
  readonly toolsHash: Hex;
  readonly confidence: bigint;
  readonly riskScore: bigint;
  readonly actionType: string;
  readonly timestamp: bigint;
}

/** Aggregated agent reputation (ReputationEngine.Reputation). */
export interface Reputation {
  readonly completedTasks: bigint;
  readonly totalEarned: bigint;
  readonly accuracyScore: bigint;
  readonly safetyScore: bigint;
  readonly speedScore: bigint;
  readonly userRatingScore: bigint;
  readonly totalScore: bigint;
}

/** A declared skill (SkillRegistry.Skill). */
export interface Skill {
  readonly id: Hex;
  readonly code: string;
  readonly description: string;
  readonly enabled: boolean;
}

/** Inputs for {@link SpartArenaClient.registerAgent}. */
export interface RegisterAgentParams {
  readonly agentWallet: Address;
  readonly metadataURI: string;
  readonly skillsHash: Hex;
}

/** Inputs for {@link SpartArenaClient.createTask}. */
export interface CreateTaskParams {
  readonly descriptionHash: Hex;
  /** Unix deadline (seconds) as a bigint, matching `uint256` on-chain. */
  readonly deadline: bigint;
  /** Reward locked in escrow, in wei (MNT has 18 decimals). */
  readonly rewardWei: bigint;
}

/** Inputs for {@link SpartArenaClient.acceptTask}. */
export interface AcceptTaskParams {
  readonly taskId: bigint;
  readonly agentId: bigint;
}

/** Inputs for {@link SpartArenaClient.recordDecision}. */
export interface RecordDecisionParams {
  readonly agentId: bigint;
  readonly taskId: bigint;
  readonly promptHash: Hex;
  readonly outputHash: Hex;
  readonly toolsHash: Hex;
  /** Confidence score, 0-100. */
  readonly confidence: bigint;
  /** Risk score, 0-100. */
  readonly riskScore: bigint;
  readonly actionType: string;
}

/** Inputs for {@link SpartArenaClient.submitResult}. */
export interface SubmitResultParams {
  readonly taskId: bigint;
  readonly agentId: bigint;
  readonly resultHash: Hex;
}

/** Inputs for {@link SpartArenaClient.submitScore}. */
export interface SubmitScoreParams {
  readonly agentId: bigint;
  readonly taskId: bigint;
  /** Accuracy score, 0-100. */
  readonly accuracy: bigint;
  /** Safety score, 0-100. */
  readonly safety: bigint;
  /** Speed score, 0-100. */
  readonly speed: bigint;
  /** User rating, 0-100. */
  readonly userRating: bigint;
}

/**
 * A viem public client constrained to the chains the SDK reads from. Kept
 * generic over transport so callers can supply http/websocket/custom clients.
 */
export type SpartArenaPublicClient = PublicClient<Transport>;

/**
 * A viem wallet client with a bound account. Write methods require this; the
 * bound account avoids ambiguous "which account?" failures at send time.
 */
export type SpartArenaWalletClient = WalletClient<Transport, undefined, Account>;

/** Constructor options for {@link SpartArenaClient}. */
export interface SpartArenaClientConfig {
  readonly publicClient: SpartArenaPublicClient;
  /** Optional — only required for write methods. */
  readonly walletClient?: SpartArenaWalletClient;
  readonly addresses: SpartArenaAddresses;
}
