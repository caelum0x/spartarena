/**
 * Rich mock data for SpartArena.
 *
 * The web app reads live data from the @spartarena/api backend, but for demos,
 * judges and offline development it must always render a populated, believable
 * Arena. These fixtures are the fallback when the API is unreachable. They mirror
 * the real view-model shapes so swapping in live data is transparent.
 *
 * Wei amounts are base-10 strings (18-decimal MNT). 1 MNT = 10^18 wei.
 */
import { TaskStatus } from "@spartarena/sdk";
import { honorTier } from "@spartarena/shared";
import type {
  AgentStakingView,
  AgentView,
  ByrealPoolView,
  DecisionView,
  LeaderboardEntry,
  ProjectBudgetView,
  ProjectChronicleEventView,
  ProjectMatchView,
  ProjectReadinessBlockerView,
  ProjectReadinessView,
  ProjectRecommendationView,
  ProjectRiskView,
  ProjectView,
  ReputationView,
  TaskView,
} from "@/types";

const MNT = (n: number): string => (BigInt(Math.round(n * 1e6)) * 10n ** 12n).toString();

const now = Math.floor(Date.UTC(2026, 5, 12) / 1000);
const days = (n: number): number => n * 86_400;

export const mockAgents: readonly AgentView[] = [
  {
    agentId: 1,
    name: "AlphaSentinel",
    description:
      "Watches Mantle for unusual wallet and token activity, scoring alpha signals with verifiable on-chain evidence before they reach the crowd.",
    owner: "0x9A7c1f4B2e6D8a3C5b0E1f2A3b4C5d6E7f809a1B",
    agentWallet: "0x1F2e3D4c5B6a7980c1D2e3F4a5B6c7D8e9F0a1b2",
    model: "claude-opus",
    skills: ["ALPHA_DETECTION", "TELEGRAM_ALERT"],
    metadataURI: "ipfs://bafkreialphasentinelmeta",
    skillsHash: "0xa11ce0000000000000000000000000000000000000000000000000000000beef",
    glory: 92,
    honorTier: honorTier(92),
    completedTasks: 47,
    totalEarnedWei: MNT(184.5),
    createdAt: now - days(120),
    active: true,
  },
  {
    agentId: 2,
    name: "YieldStrategist",
    description:
      "Conservative RWA and yield allocator. Produces capital-preservation strategies with explicit policy guardrails and a written rationale for every weight.",
    owner: "0x3B4c5D6e7F8a9b0C1d2E3f4A5b6C7d8E9f0A1b2C",
    agentWallet: "0x2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8091a2B3",
    model: "claude-sonnet",
    skills: ["RWA_STRATEGY", "BYREAL_POOL_ANALYSIS"],
    metadataURI: "ipfs://bafkreiyieldstrategistmeta",
    skillsHash: "0xb22de0000000000000000000000000000000000000000000000000000000cafe",
    glory: 84,
    honorTier: honorTier(84),
    completedTasks: 38,
    totalEarnedWei: MNT(212.0),
    createdAt: now - days(98),
    active: true,
  },
  {
    agentId: 3,
    name: "GasOracle",
    description:
      "Optimizes contract and wallet gas usage on Mantle, simulating calldata and storage layouts to cut transaction cost without changing behaviour.",
    owner: "0x4C5d6E7f8091A2b3C4d5E6f7A8b9C0d1E2f3A4b5",
    agentWallet: "0x3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8091a2b3C4",
    model: "gpt-4o",
    skills: ["GAS_OPTIMIZATION", "CONTRACT_AUDIT"],
    metadataURI: "ipfs://bafkreigasoraclemeta",
    skillsHash: "0xc33ef000000000000000000000000000000000000000000000000000000dd00d",
    glory: 71,
    honorTier: honorTier(71),
    completedTasks: 25,
    totalEarnedWei: MNT(96.25),
    createdAt: now - days(64),
    active: true,
  },
  {
    agentId: 4,
    name: "AuditPhalanx",
    description:
      "Pre-deploy smart-contract reviewer. Flags reentrancy, access-control and arithmetic risks, attaching a hashed report to every verdict.",
    owner: "0x5D6e7F8091a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6",
    agentWallet: "0x4E5f6A7b8C9d0E1f2A3b4C5d6E7f8091a2b3c4D5",
    model: "claude-opus",
    skills: ["CONTRACT_AUDIT"],
    metadataURI: "ipfs://bafkreiauditphalanxmeta",
    skillsHash: "0xd44f0000000000000000000000000000000000000000000000000000000a5519",
    glory: 58,
    honorTier: honorTier(58),
    completedTasks: 14,
    totalEarnedWei: MNT(41.0),
    createdAt: now - days(30),
    active: true,
  },
  {
    agentId: 5,
    name: "ByrealNavigator",
    description:
      "Analyzes Byreal liquidity pools and previews swap routes, surfacing slippage and depth so traders enter positions with eyes open.",
    owner: "0x6E7f8091A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7",
    agentWallet: "0x5F6a7B8c9D0e1F2a3B4c5D6e7F8091a2b3c4d5E6",
    model: "mock",
    skills: ["BYREAL_POOL_ANALYSIS", "BYREAL_SWAP_PREVIEW"],
    metadataURI: "ipfs://bafkreibyrealnavigatormeta",
    skillsHash: "0xe55a000000000000000000000000000000000000000000000000000000b0a710",
    glory: 33,
    honorTier: honorTier(33),
    completedTasks: 5,
    totalEarnedWei: MNT(12.5),
    createdAt: now - days(9),
    active: true,
  },
];

export const mockTasks: readonly TaskView[] = [
  {
    taskId: 101,
    title: "Detect anomalous MNT whale flows in the last 24h",
    description:
      "Scan recent Mantle blocks for wallets accumulating MNT or new tokens at abnormal velocity. Produce an alpha alert with evidence (tx hashes, wallets) and a recommended action.",
    creator: "0x9A7c1f4B2e6D8a3C5b0E1f2A3b4C5d6E7f809a1B",
    assignedAgentId: 1,
    assignedAgentName: "AlphaSentinel",
    rewardWei: MNT(5.0),
    descriptionHash: "0x7a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00",
    resultHash: "0x11aa22bb33cc44dd55ee66ff7788990011223344556677889900aabbccddeeff",
    status: TaskStatus.Verified,
    requiredSkill: "ALPHA_DETECTION",
    createdAt: now - days(2),
    deadline: now + days(1),
  },
  {
    taskId: 102,
    title: "Design a capital-preservation yield strategy for 50k MNT",
    description:
      "Allocate a 50,000 MNT treasury across conservative RWA/yield venues. Optimize for capital preservation first, yield second. Include policy warnings and per-asset rationale.",
    creator: "0x3B4c5D6e7F8a9b0C1d2E3f4A5b6C7d8E9f0A1b2C",
    assignedAgentId: 2,
    assignedAgentName: "YieldStrategist",
    rewardWei: MNT(8.0),
    descriptionHash: "0x8b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0011",
    status: TaskStatus.Submitted,
    requiredSkill: "RWA_STRATEGY",
    createdAt: now - days(1),
    deadline: now + days(2),
  },
  {
    taskId: 103,
    title: "Audit the StakingVault contract before mainnet deploy",
    description:
      "Review StakingVault.sol for reentrancy, access control and arithmetic issues. Return a hashed report with severity-ranked findings and remediation guidance.",
    creator: "0x5D6e7F8091a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6",
    assignedAgentId: 0,
    rewardWei: MNT(12.0),
    descriptionHash: "0x9c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff001122",
    status: TaskStatus.Open,
    requiredSkill: "CONTRACT_AUDIT",
    createdAt: now - days(0.5),
    deadline: now + days(3),
  },
  {
    taskId: 104,
    title: "Cut gas on the batch-airdrop function",
    description:
      "Profile the airdropMany() function and propose calldata/storage optimizations that reduce gas without changing semantics. Provide before/after estimates.",
    creator: "0x4C5d6E7f8091A2b3C4d5E6f7A8b9C0d1E2f3A4b5",
    assignedAgentId: 3,
    assignedAgentName: "GasOracle",
    rewardWei: MNT(4.5),
    descriptionHash: "0xa4d5e6f70718293a4b5c6d7e8f90112233445566778899aabbccddeeff0011223",
    status: TaskStatus.Paid,
    requiredSkill: "GAS_OPTIMIZATION",
    createdAt: now - days(6),
    deadline: now - days(3),
  },
  {
    taskId: 105,
    title: "Preview the best route to swap 10k USDC into MNT on Byreal",
    description:
      "Find the lowest-slippage Byreal route for a 10,000 USDC -> MNT swap. Report expected output, price impact and pool depth.",
    creator: "0x6E7f8091A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7",
    assignedAgentId: 5,
    assignedAgentName: "ByrealNavigator",
    rewardWei: MNT(3.0),
    descriptionHash: "0xb5e6f7071823a4b5c6d7e8f90112233445566778899aabbccddeeff00112233445",
    status: TaskStatus.Accepted,
    requiredSkill: "BYREAL_SWAP_PREVIEW",
    createdAt: now - days(0.2),
    deadline: now + days(1),
  },
];

function projectBattle(task: TaskView, id: string) {
  return {
    id,
    chainTaskId: task.taskId,
    projectId: null,
    title: task.title,
    description: task.description,
    descriptionHash: task.descriptionHash,
    requiredSkill: task.requiredSkill ?? null,
    creatorWallet: task.creator,
    assignedAgentId: task.assignedAgentId > 0 ? String(task.assignedAgentId) : null,
    rewardWei: task.rewardWei,
    status: taskStatusName(task.status),
    statusCode: task.status,
    deadline: String(task.deadline),
    createdAt: new Date(task.createdAt * 1000).toISOString(),
    updatedAt: new Date((task.createdAt + 3600) * 1000).toISOString(),
  };
}

function taskStatusName(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.Open:
      return "OPEN";
    case TaskStatus.Accepted:
      return "ACCEPTED";
    case TaskStatus.Submitted:
      return "SUBMITTED";
    case TaskStatus.Verified:
      return "VERIFIED";
    case TaskStatus.Paid:
      return "PAID";
    case TaskStatus.Cancelled:
      return "CANCELLED";
    default:
      return "OPEN";
  }
}

export const mockProjects: readonly ProjectView[] = [
  {
    id: "project-mantle-alpha-ops",
    slug: "mantle-alpha-ops",
    title: "Mantle Alpha Operations",
    summary:
      "A live sponsor workstream for monitoring whale flows, yield openings, swap routes and contract risk before capital is moved on Mantle.",
    sponsorWallet: "0x9A7c1f4B2e6D8a3C5b0E1f2A3b4C5d6E7f809a1B",
    treasuryWei: MNT(30),
    status: "ACTIVE",
    requiredSkills: ["ALPHA_DETECTION", "RWA_STRATEGY", "BYREAL_POOL_ANALYSIS", "CONTRACT_AUDIT"],
    deadline: String(now + days(14)),
    createdAt: new Date((now - days(8)) * 1000).toISOString(),
    updatedAt: new Date((now - 1800) * 1000).toISOString(),
    battleCount: 4,
    openBattleCount: 1,
    completedBattleCount: 2,
    progressPct: 50,
    totalRewardWei: MNT(28),
    remainingTreasuryWei: MNT(2),
    riskLevel: "MEDIUM",
    lastActivityAt: new Date((now - 1800) * 1000).toISOString(),
    battles: [
      projectBattle(mockTasks[0]!, "battle-alpha-flows"),
      projectBattle(mockTasks[1]!, "battle-yield-strategy"),
      projectBattle(mockTasks[2]!, "battle-vault-audit"),
      projectBattle(mockTasks[4]!, "battle-byreal-route"),
    ],
  },
  {
    id: "project-byreal-liquidity-board",
    slug: "byreal-liquidity-board",
    title: "Byreal Liquidity Board",
    summary:
      "A focused project for comparing Byreal pools, previewing swaps and publishing agent-generated liquidity notes with proof hashes.",
    sponsorWallet: "0x6E7f8091A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7",
    treasuryWei: MNT(12),
    status: "ACTIVE",
    requiredSkills: ["BYREAL_POOL_ANALYSIS", "BYREAL_SWAP_PREVIEW"],
    deadline: String(now + days(5)),
    createdAt: new Date((now - days(2)) * 1000).toISOString(),
    updatedAt: new Date((now - 900) * 1000).toISOString(),
    battleCount: 2,
    openBattleCount: 0,
    completedBattleCount: 0,
    progressPct: 0,
    totalRewardWei: MNT(6),
    remainingTreasuryWei: MNT(6),
    riskLevel: "MEDIUM",
    lastActivityAt: new Date((now - 900) * 1000).toISOString(),
    battles: [projectBattle(mockTasks[4]!, "battle-route-preview")],
  },
];

export const mockDecisions: readonly DecisionView[] = [
  {
    decisionId: 5001,
    agentId: 1,
    agentName: "AlphaSentinel",
    taskId: 101,
    promptHash: "0xprompt01aa22bb33cc44dd55ee66ff7788990011223344556677889900aabbcc",
    outputHash: "0x11aa22bb33cc44dd55ee66ff7788990011223344556677889900aabbccddeeff",
    toolsHash: "0xtools01cc44dd55ee66ff7788990011223344556677889900aabbccddeeff0011",
    confidence: 88,
    riskScore: 24,
    actionType: "ALPHA_ALERT",
    summary: "Detected 3 wallets accumulating $SPARTA at 6x normal velocity",
    humanExplanation:
      "Three previously-dormant wallets moved in lockstep to accumulate $SPARTA across 11 transactions within 40 minutes — a pattern consistent with informed accumulation. Recommended watchlist + alert.",
    txHash: "0xtxalpha22bb33cc44dd55ee66ff7788990011223344556677889900aabbccddee",
    timestamp: now - days(2) + 3600,
  },
  {
    decisionId: 5002,
    agentId: 2,
    agentName: "YieldStrategist",
    taskId: 102,
    promptHash: "0xprompt02bb33cc44dd55ee66ff7788990011223344556677889900aabbccddee",
    outputHash: "0xoutput02dd55ee66ff7788990011223344556677889900aabbccddeeff001122",
    toolsHash: "0xtools02ee66ff7788990011223344556677889900aabbccddeeff00112233445",
    confidence: 76,
    riskScore: 31,
    actionType: "RWA_STRATEGY",
    summary: "60/30/10 allocation favouring short-duration RWA over volatile yield",
    humanExplanation:
      "Allocated 60% to short-duration tokenized treasuries, 30% to a Byreal stable LP, and 10% to a buffer. Flagged one policy warning: avoid concentration above 35% in any single venue.",
    txHash: "0xtxyield33cc44dd55ee66ff7788990011223344556677889900aabbccddeeff00",
    timestamp: now - days(1) + 5400,
  },
  {
    decisionId: 5003,
    agentId: 3,
    agentName: "GasOracle",
    taskId: 104,
    promptHash: "0xprompt03cc44dd55ee66ff7788990011223344556677889900aabbccddeeff00",
    outputHash: "0xoutput03ee66ff7788990011223344556677889900aabbccddeeff0011223344",
    toolsHash: "0xtools03ff7788990011223344556677889900aabbccddeeff001122334455667",
    confidence: 94,
    riskScore: 9,
    actionType: "GAS_OPTIMIZATION",
    summary: "Packed recipient struct + unchecked loop saves ~38% gas",
    humanExplanation:
      "Replaced the storage-write loop with calldata iteration and packed the recipient struct into a single slot, cutting airdropMany() from ~210k to ~130k gas for 50 recipients.",
    txHash: "0xtxgas44dd55ee66ff7788990011223344556677889900aabbccddeeff0011223",
    timestamp: now - days(5) + 7200,
  },
  {
    decisionId: 5004,
    agentId: 5,
    agentName: "ByrealNavigator",
    taskId: 105,
    promptHash: "0xprompt04dd55ee66ff7788990011223344556677889900aabbccddeeff001122",
    outputHash: "0xoutput04ff7788990011223344556677889900aabbccddeeff00112233445566",
    toolsHash: "0xtools0488990011223344556677889900aabbccddeeff0011223344556677889",
    confidence: 67,
    riskScore: 42,
    actionType: "OTHER",
    summary: "Two-hop USDC->MNT route, 0.18% price impact at 10k size",
    humanExplanation:
      "Best route is USDC -> stable pool -> MNT with 0.18% price impact and adequate depth. A direct pool exists but is thinner and would incur 0.41% impact at this size.",
    txHash: "0xtxbyreal55ee66ff7788990011223344556677889900aabbccddeeff00112233",
    timestamp: now - days(0.1) + 600,
  },
];

export const mockReputations: Readonly<Record<number, ReputationView>> = {
  1: { agentId: 1, accuracy: 94, safety: 91, speed: 88, userRating: 90, total: 92, completedTasks: 47, totalEarnedWei: MNT(184.5) },
  2: { agentId: 2, accuracy: 86, safety: 88, speed: 74, userRating: 82, total: 84, completedTasks: 38, totalEarnedWei: MNT(212.0) },
  3: { agentId: 3, accuracy: 78, safety: 70, speed: 66, userRating: 62, total: 71, completedTasks: 25, totalEarnedWei: MNT(96.25) },
  4: { agentId: 4, accuracy: 62, safety: 64, speed: 48, userRating: 50, total: 58, completedTasks: 14, totalEarnedWei: MNT(41.0) },
  5: { agentId: 5, accuracy: 36, safety: 38, speed: 24, userRating: 28, total: 33, completedTasks: 5, totalEarnedWei: MNT(12.5) },
};

export function mockLeaderboard(): readonly LeaderboardEntry[] {
  return [...mockAgents]
    .sort((a, b) => b.glory - a.glory)
    .map((agent, index) => {
      const rep = mockReputations[agent.agentId];
      return {
        rank: index + 1,
        agentId: agent.agentId,
        name: agent.name,
        avatarUrl: agent.avatarUrl,
        glory: agent.glory,
        honorTier: agent.honorTier,
        completedTasks: agent.completedTasks,
        totalEarnedWei: agent.totalEarnedWei,
        accuracy: rep?.accuracy ?? 0,
        safety: rep?.safety ?? 0,
        speed: rep?.speed ?? 0,
        userRating: rep?.userRating ?? 0,
      };
    });
}

/**
 * Mock Byreal pools mirroring the real `analyzePool` result shape. Used only on
 * the opt-in mock path (NEXT_PUBLIC_USE_MOCKS=true) for offline/demo rendering.
 */
export const mockByrealPools: readonly ByrealPoolView[] = [
  {
    poolAddress: "5xZ1qN8byRealPoolAddrUSDCWMNTexampleBase58aa",
    pairLabel: "USDC/WMNT",
    tvlUsd: 4_812_400,
    volume24hUsd: 1_930_500,
    feeBps: 25,
    estimatedAprPct: 36.6,
    utilizationPct: 40,
    riskScore: 15,
    confidence: 81,
    signals: [
      "Deep liquidity reduces slippage and impermanent-loss volatility.",
      "Balanced utilization with steady fee accrual.",
      "Estimated fee APR ~36.6% at 25bps.",
    ],
    humanSummary:
      "USDC/WMNT holds $4,812,400 TVL with $1,930,500 24h volume (40% utilization). At 25bps fees this implies ~36.6% APR. Risk score 15/100, confidence 81/100. (Byreal, Solana)",
    topPick: true,
    proof: {
      toolProofHash:
        "0xb17ea1c0ffeebabe0011223344556677889900aabbccddeeff00112233445566",
      recordedOnMantle: true,
    },
  },
  {
    poolAddress: "7pQ2rM9byRealPoolAddrSOLUSDCexampleBase58bbb",
    pairLabel: "SOL/USDC",
    tvlUsd: 2_140_900,
    volume24hUsd: 3_402_700,
    feeBps: 30,
    estimatedAprPct: 58.1,
    utilizationPct: 159,
    riskScore: 40,
    confidence: 73,
    signals: [
      "Deep liquidity reduces slippage and impermanent-loss volatility.",
      "Very high utilization signals strong fee generation but elevated volatility.",
      "Estimated fee APR ~58.1% at 30bps.",
    ],
    humanSummary:
      "SOL/USDC holds $2,140,900 TVL with $3,402,700 24h volume (159% utilization). At 30bps fees this implies ~58.1% APR. Risk score 40/100, confidence 73/100. (Byreal, Solana)",
    proof: {
      toolProofHash:
        "0xc0ffee5511aabb22ccdd33eeff44001155226633774488559966aabbccdd0011",
      recordedOnMantle: true,
    },
  },
  {
    poolAddress: "9aB3sL0byRealPoolAddrmETHWMNTexampleBase58cc",
    pairLabel: "mETH/WMNT",
    tvlUsd: 318_200,
    volume24hUsd: 41_800,
    feeBps: 30,
    estimatedAprPct: 4.8,
    utilizationPct: 13,
    riskScore: 30,
    confidence: 76,
    signals: [
      "Shallow liquidity — size positions carefully to limit price impact.",
      "Balanced utilization with steady fee accrual.",
      "Estimated fee APR ~4.8% at 30bps.",
    ],
    humanSummary:
      "mETH/WMNT holds $318,200 TVL with $41,800 24h volume (13% utilization). At 30bps fees this implies ~4.8% APR. Risk score 30/100, confidence 76/100. (Byreal, Solana)",
  },
];

/** A believable War Chest (bond) per agent, derived from Glory, for the mock path. */
export function mockAgentStaking(agentId: number): AgentStakingView {
  const agent = mockAgents.find((a) => a.agentId === agentId);
  const bondMnt = agent ? 0.05 + (agent.glory / 100) * 0.45 : 0;
  const isActive = bondMnt >= 0.05;
  return {
    agentId: String(agentId),
    bond: MNT(bondMnt),
    isActive,
    available: true,
  };
}

export function findMockAgent(agentId: number): AgentView | undefined {
  return mockAgents.find((a) => a.agentId === agentId);
}

export function findMockTask(taskId: number): TaskView | undefined {
  return mockTasks.find((t) => t.taskId === taskId);
}

export function mockDecisionsForAgent(agentId: number): readonly DecisionView[] {
  return mockDecisions.filter((d) => d.agentId === agentId);
}

export function mockDecisionsForTask(taskId: number): readonly DecisionView[] {
  return mockDecisions.filter((d) => d.taskId === taskId);
}

export function mockReputation(agentId: number): ReputationView | undefined {
  return mockReputations[agentId];
}

export function mockProjectMatches(projectId: string): readonly ProjectMatchView[] {
  const project = mockProjects.find((p) => p.id === projectId || p.slug === projectId) ?? mockProjects[0]!;
  return mockAgents
    .map((agent) => {
      const matchedSkills = project.requiredSkills.filter((skill) => agent.skills.includes(skill));
      const missingSkills = project.requiredSkills.filter((skill) => !agent.skills.includes(skill));
      const skillMatchPct =
        project.requiredSkills.length === 0
          ? 100
          : Math.round((matchedSkills.length / project.requiredSkills.length) * 100);
      const rep = mockReputations[agent.agentId];
      const reputationScore = rep?.total ?? 0;
      const matchScore = Math.round(skillMatchPct * 0.65 + reputationScore * 0.35);
      return {
        agentId: String(agent.agentId),
        chainAgentId: agent.agentId,
        name: agent.name,
        slug: agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: agent.description,
        agentWallet: agent.agentWallet,
        skills: agent.skills,
        matchedSkills,
        missingSkills,
        skillMatchPct,
        reputationScore,
        completedBattles: rep?.completedTasks ?? 0,
        matchScore,
        reason:
          matchedSkills.length > 0
            ? `${agent.name} covers ${matchedSkills.join(", ")} with ${rep?.completedTasks ?? 0} completed Battle(s).`
            : `${agent.name} has no direct overlap with this Project's current skill list.`,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 8);
}

export function mockProjectChronicle(projectId: string): readonly ProjectChronicleEventView[] {
  const project = mockProjects.find((p) => p.id === projectId || p.slug === projectId) ?? mockProjects[0]!;
  const events: ProjectChronicleEventView[] = [
    {
      id: `${project.id}:created`,
      type: "PROJECT_CREATED",
      title: "Project created",
      description: `${project.title} opened with ${project.requiredSkills.length} required skill(s).`,
      battleId: null,
      battleTitle: null,
      chainTaskId: null,
      decisionId: null,
      chainDecisionId: null,
      actionType: null,
      confidence: null,
      riskScore: null,
      txHash: null,
      timestamp: project.createdAt,
    },
  ];

  for (const battle of project.battles) {
    events.push({
      id: `${battle.id}:created`,
      type: "BATTLE_CREATED",
      title: "Battle posted",
      description: battle.requiredSkill
        ? `${battle.title} opened for ${battle.requiredSkill}.`
        : `${battle.title} opened.`,
      battleId: battle.id,
      battleTitle: battle.title,
      chainTaskId: battle.chainTaskId,
      decisionId: null,
      chainDecisionId: null,
      actionType: null,
      confidence: null,
      riskScore: null,
      txHash: null,
      timestamp: battle.createdAt,
    });
    if (battle.status !== "OPEN") {
      events.push({
        id: `${battle.id}:status:${battle.status}`,
        type: "BATTLE_STATUS",
        title: `Battle ${battle.status.toLowerCase()}`,
        description: `${battle.title} is currently ${battle.status}.`,
        battleId: battle.id,
        battleTitle: battle.title,
        chainTaskId: battle.chainTaskId,
        decisionId: null,
        chainDecisionId: null,
        actionType: null,
        confidence: null,
        riskScore: null,
        txHash: null,
        timestamp: battle.updatedAt,
      });
    }
  }

  const chainIds = new Set(project.battles.map((battle) => battle.chainTaskId).filter((id) => id !== null));
  for (const decision of mockDecisions.filter((item) => chainIds.has(item.taskId))) {
    const battle = project.battles.find((item) => item.chainTaskId === decision.taskId);
    events.push({
      id: `decision-${decision.decisionId}`,
      type: "DECISION_RECORDED",
      title: "Decision proof recorded",
      description: `${decision.actionType} proof recorded with ${decision.confidence}% confidence and ${decision.riskScore}% risk.`,
      battleId: battle?.id ?? null,
      battleTitle: battle?.title ?? null,
      chainTaskId: decision.taskId,
      decisionId: String(decision.decisionId),
      chainDecisionId: decision.decisionId,
      actionType: decision.actionType,
      confidence: decision.confidence,
      riskScore: decision.riskScore,
      txHash: decision.txHash ?? null,
      timestamp: new Date(decision.timestamp * 1000).toISOString(),
    });
  }

  return events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 40);
}

export function mockProjectBudget(projectId: string): ProjectBudgetView {
  const project = mockProjects.find((p) => p.id === projectId || p.slug === projectId) ?? mockProjects[0]!;
  const allocated = project.battles.reduce((sum, battle) => sum + BigInt(battle.rewardWei), 0n);
  const treasury = BigInt(project.treasuryWei);
  const remaining = treasury > allocated ? treasury - allocated : 0n;
  const coveredSkills = new Set(
    project.battles
      .filter((battle) => battle.status !== "CANCELLED" && battle.requiredSkill)
      .map((battle) => battle.requiredSkill as string),
  );
  const averageReward =
    project.battles.length > 0 ? allocated / BigInt(project.battles.length) : BigInt(MNT(2));
  const runway = averageReward > 0n ? remaining / averageReward : 0n;

  return {
    projectId: project.id,
    treasuryWei: project.treasuryWei,
    allocatedWei: allocated.toString(),
    remainingWei: remaining.toString(),
    openWei: sumMockStatusWei(project, ["OPEN"]).toString(),
    activeWei: sumMockStatusWei(project, ["ACCEPTED", "SUBMITTED"]).toString(),
    completedWei: sumMockStatusWei(project, ["VERIFIED", "PAID"]).toString(),
    coveragePct:
      project.requiredSkills.length === 0
        ? 100
        : Math.round((coveredSkills.size / project.requiredSkills.length) * 100),
    runwayBattleCount: Number(runway > 99n ? 99n : runway),
    oversubscribed: allocated > treasury,
    statusBreakdown: ["OPEN", "ACCEPTED", "SUBMITTED", "VERIFIED", "PAID", "CANCELLED"].map((status) => {
      const battles = project.battles.filter((battle) => battle.status === status);
      return {
        status,
        battleCount: battles.length,
        rewardWei: battles.reduce((sum, battle) => sum + BigInt(battle.rewardWei), 0n).toString(),
      };
    }),
    skillBreakdown: project.requiredSkills.map((skill) => {
      const battles = project.battles.filter(
        (battle) => battle.status !== "CANCELLED" && battle.requiredSkill === skill,
      );
      return {
        skill,
        battleCount: battles.length,
        rewardWei: battles.reduce((sum, battle) => sum + BigInt(battle.rewardWei), 0n).toString(),
        covered: battles.length > 0,
      };
    }),
  };
}

function sumMockStatusWei(project: ProjectView, statuses: readonly string[]): bigint {
  const allowed = new Set(statuses);
  return project.battles
    .filter((battle) => allowed.has(battle.status))
    .reduce((sum, battle) => sum + BigInt(battle.rewardWei), 0n);
}

export function mockProjectRisks(projectId: string): readonly ProjectRiskView[] {
  const project = mockProjects.find((p) => p.id === projectId || p.slug === projectId) ?? mockProjects[0]!;
  const budget = mockProjectBudget(project.id);
  const detectedAt = new Date(now * 1000).toISOString();
  const risks: ProjectRiskView[] = [];
  const missingSkills = project.requiredSkills.filter(
    (skill) =>
      !project.battles.some((battle) => battle.status !== "CANCELLED" && battle.requiredSkill === skill),
  );
  const unfinished = project.battles.filter(
    (battle) => battle.status !== "VERIFIED" && battle.status !== "PAID",
  );
  const secondsToDeadline = project.deadline ? Number(project.deadline) - now : null;

  if (budget.oversubscribed) {
    risks.push({
      id: `${project.id}:treasury:oversubscribed`,
      severity: "HIGH",
      category: "TREASURY",
      title: "Rewards exceed treasury intent",
      description: "Allocated Battle rewards are greater than the Project treasury budget.",
      suggestedAction: "Increase treasury intent or reduce future Battle reward sizes.",
      actionType: "UPDATE_PROJECT",
      requiredSkill: null,
      battleId: null,
      chainTaskId: null,
      detectedAt,
    });
  }

  if (secondsToDeadline !== null && secondsToDeadline < 3 * 86_400 && unfinished.length > 0) {
    risks.push({
      id: `${project.id}:deadline:soon`,
      severity: "HIGH",
      category: "DEADLINE",
      title: "Deadline pressure",
      description: `${unfinished.length} unfinished Battle(s) remain with less than three days before deadline.`,
      suggestedAction: "Prioritize assignment, verification, or deadline adjustment.",
      actionType: "FIND_SPARTANS",
      requiredSkill: null,
      battleId: unfinished[0]?.id ?? null,
      chainTaskId: unfinished[0]?.chainTaskId ?? null,
      detectedAt,
    });
  }

  for (const skill of missingSkills) {
    risks.push({
      id: `${project.id}:coverage:${skill}`,
      severity: project.status === "ACTIVE" ? "HIGH" : "MEDIUM",
      category: "COVERAGE",
      title: `${skill} has no Battle coverage`,
      description: "A required Project skill has no active Battle attached to it.",
      suggestedAction: "Draft a Battle for this required skill.",
      actionType: "ADD_BATTLE",
      requiredSkill: skill,
      battleId: null,
      chainTaskId: null,
      detectedAt,
    });
  }

  const submitted = project.battles.find((battle) => battle.status === "SUBMITTED");
  if (submitted) {
    risks.push({
      id: `${project.id}:settlement:${submitted.id}`,
      severity: "MEDIUM",
      category: "SETTLEMENT",
      title: "Submitted Battle awaits verification",
      description: `${submitted.title} has submitted output that should be verified or sent back for follow-up.`,
      suggestedAction: "Review the decision proof and verify the Battle when ready.",
      actionType: "VERIFY_BATTLE",
      requiredSkill: submitted.requiredSkill,
      battleId: submitted.id,
      chainTaskId: submitted.chainTaskId,
      detectedAt,
    });
  }

  if (risks.length === 0 && project.status === "ACTIVE" && budget.runwayBattleCount <= 1) {
    risks.push({
      id: `${project.id}:treasury:low-runway`,
      severity: "MEDIUM",
      category: "TREASURY",
      title: "Low reward runway",
      description: "Remaining treasury covers at most one average-sized follow-up Battle.",
      suggestedAction: "Reserve remaining budget for the highest-priority coverage gap.",
      actionType: "ADD_BATTLE",
      requiredSkill: missingSkills[0] ?? null,
      battleId: null,
      chainTaskId: null,
      detectedAt,
    });
  }

  return risks.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)).slice(0, 12);
}

export function mockProjectReadiness(projectId: string): ProjectReadinessView {
  const project = mockProjects.find((p) => p.id === projectId || p.slug === projectId) ?? mockProjects[0]!;
  const budget = mockProjectBudget(project.id);
  const risks = mockProjectRisks(project.id);
  const highRisks = risks.filter((risk) => risk.severity === "HIGH");
  const mediumRisks = risks.filter((risk) => risk.severity === "MEDIUM");
  const completedBattles = project.battles.filter(
    (battle) => battle.status === "VERIFIED" || battle.status === "PAID",
  );
  const unsettledBattles = project.battles.filter(
    (battle) => battle.status !== "VERIFIED" && battle.status !== "PAID" && battle.status !== "CANCELLED",
  );
  const checklist = [
    {
      id: "has-battles",
      label: "Battle scope exists",
      complete: project.battles.length > 0,
      detail:
        project.battles.length > 0
          ? `${project.battles.length} Battle(s) are attached to this Project.`
          : "Post at least one Battle before settlement.",
    },
    {
      id: "all-battles-finished",
      label: "No active Battle work remains",
      complete: unsettledBattles.length === 0 && project.battles.length > 0,
      detail:
        unsettledBattles.length === 0
          ? "All Battles are verified, paid or cancelled."
          : `${unsettledBattles.length} Battle(s) still need assignment, execution or verification.`,
    },
    {
      id: "skill-coverage",
      label: "Required skills covered",
      complete: budget.coveragePct === 100,
      detail: `${budget.coveragePct}% of required skills have active Battle coverage.`,
    },
    {
      id: "no-high-risks",
      label: "High risks cleared",
      complete: highRisks.length === 0,
      detail:
        highRisks.length === 0
          ? "No high-severity Project risks are currently detected."
          : `${highRisks.length} high-severity risk(s) remain.`,
    },
    {
      id: "treasury-balanced",
      label: "Treasury is balanced",
      complete: !budget.oversubscribed,
      detail: budget.oversubscribed
        ? "Allocated Battle rewards exceed the Project treasury intent."
        : "Allocated Battle rewards are within treasury intent.",
    },
    {
      id: "proofs-exist",
      label: "Proof-bearing work exists",
      complete: completedBattles.length > 0,
      detail:
        completedBattles.length > 0
          ? `${completedBattles.length} Battle(s) are verified or paid.`
          : "No verified or paid Battle proofs are attached yet.",
    },
  ];
  const completeCount = checklist.filter((item) => item.complete).length;
  const scorePct = Math.round((completeCount / checklist.length) * 100);
  const readyToSettle =
    project.status !== "ARCHIVED" &&
    project.battles.length > 0 &&
    unsettledBattles.length === 0 &&
    highRisks.length === 0 &&
    budget.coveragePct === 100 &&
    !budget.oversubscribed;
  const readyToArchive = project.status === "SETTLED" && readyToSettle && mediumRisks.length === 0;
  const checklistBlockers: ProjectReadinessBlockerView[] = checklist
    .filter((item) => !item.complete)
    .slice(0, 3)
    .map((item) => {
      const severity: ProjectReadinessBlockerView["severity"] =
        item.id === "all-battles-finished" || item.id === "has-battles" ? "HIGH" : "MEDIUM";
      const actionType: ProjectReadinessBlockerView["actionType"] =
        item.id === "has-battles" || item.id === "skill-coverage" ? "ADD_BATTLE" : "UPDATE_PROJECT";
      return {
        id: `check:${item.id}`,
        severity,
        label: item.label,
        detail: item.detail,
        actionType,
        requiredSkill: null,
        chainTaskId: null,
      };
    });
  const blockers: ProjectReadinessBlockerView[] = [
    ...risks.slice(0, 6).map((risk) => ({
      id: risk.id,
      severity: risk.severity,
      label: risk.title,
      detail: risk.suggestedAction,
      actionType: risk.actionType,
      requiredSkill: risk.requiredSkill,
      chainTaskId: risk.chainTaskId,
    })),
    ...checklistBlockers,
  ];

  return {
    projectId: project.id,
    scorePct,
    readyToSettle,
    readyToArchive,
    summary: readyToArchive
      ? "Project is ready to archive after settlement review."
      : readyToSettle
        ? "Project is ready to move into settlement."
        : `${scorePct}% ready with ${blockers.length} blocker(s) to clear.`,
    nextAction: readyToArchive
      ? "Archive the Project when sponsor review is complete."
      : readyToSettle
        ? "Set Project status to SETTLED in operations."
        : blockers[0]?.detail ?? "Continue Battle execution and proof review.",
    completedBattleCount: completedBattles.length,
    unsettledBattleCount: unsettledBattles.length,
    blockers,
    checklist,
  };
}

function severityRank(severity: ProjectRiskView["severity"]): number {
  if (severity === "HIGH") return 3;
  if (severity === "MEDIUM") return 2;
  return 1;
}

export function mockProjectRecommendations(projectId: string): readonly ProjectRecommendationView[] {
  const project = mockProjects.find((p) => p.id === projectId || p.slug === projectId) ?? mockProjects[0]!;
  const coveredSkills = new Set(
    project.battles
      .filter((battle) => battle.status !== "CANCELLED" && battle.requiredSkill)
      .map((battle) => battle.requiredSkill as string),
  );
  const missingSkills = project.requiredSkills.filter((skill) => !coveredSkills.has(skill));
  if (missingSkills.length === 0) return [];

  const rewardWei = project.remainingTreasuryWei !== "0" ? project.remainingTreasuryWei : MNT(2);
  return missingSkills.map((skill) => ({
    id: `${project.slug}-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: mockRecommendationTitle(skill),
    description: mockRecommendationDescription(skill),
    requiredSkill: skill,
    rewardWei,
    deadlineDays: project.riskLevel === "HIGH" ? 1 : project.riskLevel === "MEDIUM" ? 3 : 5,
    priority: project.riskLevel,
    rationale: `${skill} is required by this Project but has no active Battle coverage yet.`,
  }));
}

function mockRecommendationTitle(skill: string): string {
  switch (skill) {
    case "ALPHA_DETECTION":
      return "Detect Mantle capital-flow anomalies";
    case "RWA_STRATEGY":
      return "Draft a risk-balanced RWA allocation note";
    case "BYREAL_POOL_ANALYSIS":
      return "Analyze Byreal pool depth and fee quality";
    case "BYREAL_SWAP_PREVIEW":
      return "Preview Byreal swap routes for sponsor flows";
    case "CONTRACT_AUDIT":
      return "Audit Project contracts for settlement risk";
    default:
      return `Cover ${skill}`;
  }
}

function mockRecommendationDescription(skill: string): string {
  switch (skill) {
    case "ALPHA_DETECTION":
      return "Review recent Mantle wallet, pool and bridge movements. Return unusual accumulation, distribution or routing patterns with confidence, risk score and source links.";
    case "RWA_STRATEGY":
      return "Compare available RWA and stable-yield venues for the Project objective. Return an allocation proposal, risk limits, liquidity constraints and conditions for pausing deployment.";
    case "BYREAL_POOL_ANALYSIS":
      return "Evaluate the target Byreal pools for TVL, volume, fee APR, utilization and concentration risk. Return ranked pools with proof hashes and position-size guidance.";
    case "BYREAL_SWAP_PREVIEW":
      return "Preview expected swap paths, price impact and slippage limits for sponsor-sized trades. Return the safest route, rejected alternatives and execution constraints.";
    case "CONTRACT_AUDIT":
      return "Review the Project's relevant contracts, permissions and upgrade paths. Return high-impact findings, exploitability, remediation steps and confidence.";
    default:
      return "Create a focused Battle for this missing Project skill. Return evidence, confidence, risk notes and the next recommended sponsor action.";
  }
}
