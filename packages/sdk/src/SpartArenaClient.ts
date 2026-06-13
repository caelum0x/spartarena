import type { Address, Hex } from "viem";
import type { SpartArenaAddresses } from "./addresses.js";
import * as agents from "./agents.js";
import * as tasks from "./tasks.js";
import * as decisions from "./decisions.js";
import * as reputation from "./reputation.js";
import * as staking from "./staking.js";
import type { StakingOverview } from "./staking.js";
import type {
  AcceptTaskParams,
  Agent,
  CreateTaskParams,
  Decision,
  RecordDecisionParams,
  RegisterAgentParams,
  Reputation,
  Skill,
  SpartArenaClientConfig,
  SpartArenaPublicClient,
  SpartArenaWalletClient,
  SubmitResultParams,
  SubmitScoreParams,
  Task,
} from "./types.js";

/** Raised when a write method is called without a configured wallet client. */
export class MissingWalletClientError extends Error {
  public constructor(method: string) {
    super(`SpartArenaClient.${method}() requires a walletClient, but none was configured.`);
    this.name = "MissingWalletClientError";
  }
}

/**
 * High-level, strongly-typed client over the five SpartArena contracts.
 *
 * Reads only need a `publicClient`. Writes additionally require a `walletClient`
 * with a bound account; calling a write without one throws
 * {@link MissingWalletClientError} rather than failing deep inside viem.
 *
 * Every write simulates the call first (via the helper modules), so contract
 * reverts — insufficient escrow, unauthorised writer, bad status — surface
 * before a transaction is ever signed.
 */
export class SpartArenaClient {
  private readonly publicClient: SpartArenaPublicClient;
  private readonly walletClient: SpartArenaWalletClient | undefined;
  public readonly addresses: SpartArenaAddresses;

  public constructor(config: SpartArenaClientConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.addresses = config.addresses;
  }

  /** Whether write methods are available (a wallet client is configured). */
  public get canWrite(): boolean {
    return this.walletClient !== undefined;
  }

  private requireWallet(method: string): SpartArenaWalletClient {
    if (this.walletClient === undefined) {
      throw new MissingWalletClientError(method);
    }
    return this.walletClient;
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  public getAgent(agentId: bigint): Promise<Agent> {
    return agents.getAgent(this.publicClient, this.addresses.AgentRegistry, agentId);
  }

  public getAgentCount(): Promise<bigint> {
    return agents.getAgentCount(this.publicClient, this.addresses.AgentRegistry);
  }

  public getAgentsOf(owner: Address): Promise<readonly bigint[]> {
    return agents.getAgentsOf(this.publicClient, this.addresses.AgentRegistry, owner);
  }

  public getTask(taskId: bigint): Promise<Task> {
    return tasks.getTask(this.publicClient, this.addresses.TaskEscrow, taskId);
  }

  public getTaskCount(): Promise<bigint> {
    return tasks.getTaskCount(this.publicClient, this.addresses.TaskEscrow);
  }

  public getDecision(decisionId: bigint): Promise<Decision> {
    return decisions.getDecision(this.publicClient, this.addresses.DecisionLedger, decisionId);
  }

  public getDecisionCount(): Promise<bigint> {
    return decisions.getDecisionCount(this.publicClient, this.addresses.DecisionLedger);
  }

  public getDecisionsOfAgent(agentId: bigint): Promise<readonly bigint[]> {
    return decisions.getDecisionsOfAgent(this.publicClient, this.addresses.DecisionLedger, agentId);
  }

  public getDecisionsOfTask(taskId: bigint): Promise<readonly bigint[]> {
    return decisions.getDecisionsOfTask(this.publicClient, this.addresses.DecisionLedger, taskId);
  }

  public getReputation(agentId: bigint): Promise<Reputation> {
    return reputation.getReputation(this.publicClient, this.addresses.ReputationEngine, agentId);
  }

  public getSkills(): Promise<readonly Skill[]> {
    return reputation.getSkills(this.publicClient, this.addresses.SkillRegistry);
  }

  public getBond(agentId: bigint): Promise<bigint> {
    return staking.getBond(this.publicClient, this.addresses.AgentStaking, agentId);
  }

  public isAgentActive(agentId: bigint): Promise<boolean> {
    return staking.isAgentActive(this.publicClient, this.addresses.AgentStaking, agentId);
  }

  public getStakingOverview(): Promise<StakingOverview> {
    return staking.getStakingOverview(this.publicClient, this.addresses.AgentStaking);
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  public registerAgent(params: RegisterAgentParams): Promise<Hex> {
    const wallet = this.requireWallet("registerAgent");
    return agents.registerAgent(wallet, this.publicClient, this.addresses.AgentRegistry, params);
  }

  public createTask(params: CreateTaskParams): Promise<Hex> {
    const wallet = this.requireWallet("createTask");
    return tasks.createTask(wallet, this.publicClient, this.addresses.TaskEscrow, params);
  }

  public acceptTask(params: AcceptTaskParams): Promise<Hex> {
    const wallet = this.requireWallet("acceptTask");
    return tasks.acceptTask(wallet, this.publicClient, this.addresses.TaskEscrow, params);
  }

  public submitResult(params: SubmitResultParams): Promise<Hex> {
    const wallet = this.requireWallet("submitResult");
    return tasks.submitResult(wallet, this.publicClient, this.addresses.TaskEscrow, params);
  }

  public verifyTask(taskId: bigint): Promise<Hex> {
    const wallet = this.requireWallet("verifyTask");
    return tasks.verifyTask(wallet, this.publicClient, this.addresses.TaskEscrow, taskId);
  }

  public releasePayment(taskId: bigint): Promise<Hex> {
    const wallet = this.requireWallet("releasePayment");
    return tasks.releasePayment(wallet, this.publicClient, this.addresses.TaskEscrow, taskId);
  }

  public recordDecision(params: RecordDecisionParams): Promise<Hex> {
    const wallet = this.requireWallet("recordDecision");
    return decisions.recordDecision(
      wallet,
      this.publicClient,
      this.addresses.DecisionLedger,
      params,
    );
  }

  public submitScore(params: SubmitScoreParams): Promise<Hex> {
    const wallet = this.requireWallet("submitScore");
    return reputation.submitScore(
      wallet,
      this.publicClient,
      this.addresses.ReputationEngine,
      params,
    );
  }

  public stake(agentId: bigint, valueWei: bigint): Promise<Hex> {
    const wallet = this.requireWallet("stake");
    return staking.stake(wallet, this.publicClient, this.addresses.AgentStaking, agentId, valueWei);
  }

  public unstake(agentId: bigint, amount: bigint): Promise<Hex> {
    const wallet = this.requireWallet("unstake");
    return staking.unstake(wallet, this.publicClient, this.addresses.AgentStaking, agentId, amount);
  }

  public slash(agentId: bigint, amount: bigint, reason: string): Promise<Hex> {
    const wallet = this.requireWallet("slash");
    return staking.slash(wallet, this.publicClient, this.addresses.AgentStaking, agentId, amount, reason);
  }
}
