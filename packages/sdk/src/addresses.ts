import { getAddress, isAddress, type Address } from "viem";

/** Names of the SpartArena contracts the SDK talks to. */
export const CONTRACT_NAMES = [
  "AgentRegistry",
  "TaskEscrow",
  "DecisionLedger",
  "ReputationEngine",
  "SkillRegistry",
  "AgentStaking",
] as const;

export type ContractName = (typeof CONTRACT_NAMES)[number];

/** The five contract addresses the SDK needs, validated as checksummed. */
export type SpartArenaAddresses = {
  readonly [K in ContractName]: Address;
};

/**
 * Shape of the deployment JSON written by the Foundry deploy scripts to
 * `packages/contracts/deployments/<chainId>.json`. Addresses are raw strings on
 * disk and may carry extra bookkeeping fields (backendSigner, chainId, …).
 */
export interface DeploymentFile {
  readonly AgentRegistry: string;
  readonly TaskEscrow: string;
  readonly DecisionLedger: string;
  readonly ReputationEngine: string;
  readonly SkillRegistry: string;
  readonly AgentStaking: string;
  readonly backendSigner?: string;
  readonly chainId?: number;
  readonly [extra: string]: string | number | undefined;
}

/** Error raised when an address source is missing or malformed. */
export class AddressConfigError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AddressConfigError";
  }
}

function requireAddress(value: string | undefined, label: string): Address {
  if (value === undefined || value.length === 0) {
    throw new AddressConfigError(`Missing contract address for ${label}.`);
  }
  if (!isAddress(value)) {
    throw new AddressConfigError(`Invalid contract address for ${label}: "${value}".`);
  }
  // Normalise to checksummed form so downstream comparisons are stable.
  return getAddress(value);
}

/**
 * Validate and normalise a deployment file (or any record of contract → address
 * strings) into a strongly-typed, checksummed address map.
 */
export function parseAddresses(source: DeploymentFile): SpartArenaAddresses {
  return {
    AgentRegistry: requireAddress(source.AgentRegistry, "AgentRegistry"),
    TaskEscrow: requireAddress(source.TaskEscrow, "TaskEscrow"),
    DecisionLedger: requireAddress(source.DecisionLedger, "DecisionLedger"),
    ReputationEngine: requireAddress(source.ReputationEngine, "ReputationEngine"),
    SkillRegistry: requireAddress(source.SkillRegistry, "SkillRegistry"),
    AgentStaking: requireAddress(source.AgentStaking, "AgentStaking"),
  };
}

/** Environment variable names, matching the root `.env.example` contract keys. */
export const ADDRESS_ENV_KEYS = {
  AgentRegistry: "NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS",
  TaskEscrow: "NEXT_PUBLIC_TASK_ESCROW_ADDRESS",
  DecisionLedger: "NEXT_PUBLIC_DECISION_LEDGER_ADDRESS",
  ReputationEngine: "NEXT_PUBLIC_REPUTATION_ENGINE_ADDRESS",
  SkillRegistry: "NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS",
  AgentStaking: "NEXT_PUBLIC_AGENT_STAKING_ADDRESS",
} as const satisfies Record<ContractName, string>;

/** A minimal read-only environment, e.g. `process.env`. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * Build a validated address map from environment variables. Throws an
 * {@link AddressConfigError} listing every missing/invalid key so callers fail
 * fast at startup rather than mid-transaction.
 */
export function loadAddressesFromEnv(env: EnvSource): SpartArenaAddresses {
  return parseAddresses({
    AgentRegistry: env[ADDRESS_ENV_KEYS.AgentRegistry] ?? "",
    TaskEscrow: env[ADDRESS_ENV_KEYS.TaskEscrow] ?? "",
    DecisionLedger: env[ADDRESS_ENV_KEYS.DecisionLedger] ?? "",
    ReputationEngine: env[ADDRESS_ENV_KEYS.ReputationEngine] ?? "",
    SkillRegistry: env[ADDRESS_ENV_KEYS.SkillRegistry] ?? "",
    AgentStaking: env[ADDRESS_ENV_KEYS.AgentStaking] ?? "",
  });
}
