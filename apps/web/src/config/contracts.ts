/**
 * Contract address resolution from public env.
 *
 * Addresses are optional: when any are missing the app runs in read-only / mock
 * mode (writes are disabled but every page still renders). `contractAddresses`
 * returns a fully-typed {@link SpartArenaAddresses} when all five are present,
 * otherwise `undefined`.
 */
import type { Address } from "viem";
import type { SpartArenaAddresses } from "@spartarena/sdk";
import {
  agentRegistryAbi,
  taskEscrowAbi,
  decisionLedgerAbi,
  reputationEngineAbi,
  skillRegistryAbi,
  agentStakingAbi,
} from "@spartarena/sdk";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function readAddress(value: string | undefined): Address | undefined {
  if (value && ADDRESS_RE.test(value)) {
    return value as Address;
  }
  return undefined;
}

const raw = {
  AgentRegistry: readAddress(process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS),
  TaskEscrow: readAddress(process.env.NEXT_PUBLIC_TASK_ESCROW_ADDRESS),
  DecisionLedger: readAddress(process.env.NEXT_PUBLIC_DECISION_LEDGER_ADDRESS),
  ReputationEngine: readAddress(process.env.NEXT_PUBLIC_REPUTATION_ENGINE_ADDRESS),
  SkillRegistry: readAddress(process.env.NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS),
  AgentStaking: readAddress(process.env.NEXT_PUBLIC_AGENT_STAKING_ADDRESS),
} as const;

/** True when every contract address is configured (on-chain writes possible). */
export const hasContractAddresses: boolean = Object.values(raw).every(
  (a): a is Address => a !== undefined,
);

/** Fully-typed addresses, or undefined when not fully configured. */
export const contractAddresses: SpartArenaAddresses | undefined = hasContractAddresses
  ? (raw as SpartArenaAddresses)
  : undefined;

/** ABIs keyed by contract for direct wagmi `useWriteContract` calls. */
export const contractAbis = {
  AgentRegistry: agentRegistryAbi,
  TaskEscrow: taskEscrowAbi,
  DecisionLedger: decisionLedgerAbi,
  ReputationEngine: reputationEngineAbi,
  SkillRegistry: skillRegistryAbi,
  AgentStaking: agentStakingAbi,
} as const;
