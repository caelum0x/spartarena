import { readBond, readAgentActive, readStakingOverview } from "../../chain/contractReads.js";

export interface AgentStakingView {
  agentId: string;
  bond: string;
  isActive: boolean;
  available: boolean;
}

export interface StakingOverviewView {
  totalBonded: string;
  minBond: string;
  treasury: string | null;
  available: boolean;
}

/**
 * Staking (the Spartan "war chest"). Reads the AgentStaking contract via the SDK
 * client and returns chain truth, degrading gracefully (available:false) when
 * contract addresses are not configured.
 */
export const stakingService = {
  async forAgent(agentId: bigint): Promise<AgentStakingView> {
    const [bond, active] = await Promise.all([readBond(agentId), readAgentActive(agentId)]);
    return {
      agentId: agentId.toString(),
      bond: (bond ?? 0n).toString(),
      isActive: active ?? false,
      available: bond !== undefined,
    };
  },

  async overview(): Promise<StakingOverviewView> {
    const o = await readStakingOverview();
    return {
      totalBonded: (o?.totalBonded ?? 0n).toString(),
      minBond: (o?.minBond ?? 0n).toString(),
      treasury: o?.treasury ?? null,
      available: o !== undefined,
    };
  },
};
