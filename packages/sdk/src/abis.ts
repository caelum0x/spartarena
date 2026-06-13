/**
 * Minimal, strongly-typed inline ABIs for the contract surface the SDK uses.
 *
 * The published `packages/contracts/abi/*.json` files are human-readable
 * signature tables (Foundry `forge inspect`-style), not raw JSON ABI arrays, so
 * the SDK declares the exact fragments it needs as `const` tuples. Viem infers
 * argument and return types directly from these literals, which is what gives
 * the client its end-to-end type-safety without any `any`.
 *
 * Struct shapes mirror the Solidity sources in `packages/contracts/src`.
 */

export const agentRegistryAbi = [
  {
    type: "function",
    name: "registerAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentWallet", type: "address" },
      { name: "metadataURI", type: "string" },
      { name: "skillsHash", type: "bytes32" },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAgent",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "owner", type: "address" },
          { name: "agentWallet", type: "address" },
          { name: "metadataURI", type: "string" },
          { name: "skillsHash", type: "bytes32" },
          { name: "createdAt", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "agentCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "agentsOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "exists",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "agentWallet", type: "address", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
      { name: "skillsHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

export const taskEscrowAbi = [
  {
    type: "function",
    name: "createTask",
    stateMutability: "payable",
    inputs: [
      { name: "descriptionHash", type: "bytes32" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "taskId", type: "uint256" }],
  },
  {
    type: "function",
    name: "acceptTask",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "agentId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "submitResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "agentId", type: "uint256" },
      { name: "resultHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "verifyTask",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "releasePayment",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "refundExpiredTask",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getTask",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "assignedAgentId", type: "uint256" },
          { name: "reward", type: "uint256" },
          { name: "descriptionHash", type: "bytes32" },
          { name: "resultHash", type: "bytes32" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "taskCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "TaskCreated",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "reward", type: "uint256", indexed: false },
      { name: "descriptionHash", type: "bytes32", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskAccepted",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "ResultSubmitted",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "resultHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskVerified",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "PaymentReleased",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "to", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskCancelled",
    inputs: [{ name: "taskId", type: "uint256", indexed: true }],
  },
] as const;

export const decisionLedgerAbi = [
  {
    type: "function",
    name: "recordDecision",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "taskId", type: "uint256" },
      { name: "promptHash", type: "bytes32" },
      { name: "outputHash", type: "bytes32" },
      { name: "toolsHash", type: "bytes32" },
      { name: "confidence", type: "uint256" },
      { name: "riskScore", type: "uint256" },
      { name: "actionType", type: "string" },
    ],
    outputs: [{ name: "decisionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "getDecision",
    stateMutability: "view",
    inputs: [{ name: "decisionId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "agentId", type: "uint256" },
          { name: "taskId", type: "uint256" },
          { name: "promptHash", type: "bytes32" },
          { name: "outputHash", type: "bytes32" },
          { name: "toolsHash", type: "bytes32" },
          { name: "confidence", type: "uint256" },
          { name: "riskScore", type: "uint256" },
          { name: "actionType", type: "string" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "decisionCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decisionsOfAgent",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "decisionsOfTask",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "event",
    name: "DecisionRecorded",
    inputs: [
      { name: "decisionId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "taskId", type: "uint256", indexed: true },
      { name: "promptHash", type: "bytes32", indexed: false },
      { name: "outputHash", type: "bytes32", indexed: false },
      { name: "toolsHash", type: "bytes32", indexed: false },
      { name: "confidence", type: "uint256", indexed: false },
      { name: "riskScore", type: "uint256", indexed: false },
      { name: "actionType", type: "string", indexed: false },
    ],
  },
] as const;

export const reputationEngineAbi = [
  {
    type: "function",
    name: "submitScore",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "taskId", type: "uint256" },
      { name: "accuracy", type: "uint256" },
      { name: "safety", type: "uint256" },
      { name: "speed", type: "uint256" },
      { name: "userRating", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "recordEarnings",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getReputation",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "completedTasks", type: "uint256" },
          { name: "totalEarned", type: "uint256" },
          { name: "accuracyScore", type: "uint256" },
          { name: "safetyScore", type: "uint256" },
          { name: "speedScore", type: "uint256" },
          { name: "userRatingScore", type: "uint256" },
          { name: "totalScore", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "ScoreSubmitted",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "taskId", type: "uint256", indexed: true },
      { name: "accuracy", type: "uint256", indexed: false },
      { name: "safety", type: "uint256", indexed: false },
      { name: "speed", type: "uint256", indexed: false },
      { name: "userRating", type: "uint256", indexed: false },
      { name: "totalScore", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EarningsRecorded",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "totalEarned", type: "uint256", indexed: false },
    ],
  },
] as const;

export const skillRegistryAbi = [
  {
    type: "function",
    name: "allSkillIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    type: "function",
    name: "getSkill",
    stateMutability: "view",
    inputs: [{ name: "skillId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "bytes32" },
          { name: "code", type: "string" },
          { name: "description", type: "string" },
          { name: "enabled", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "skillCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const agentStakingAbi = [
  {
    type: "function",
    name: "stake",
    stateMutability: "payable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "unstake",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "slash",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "bondOf",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalBonded",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "minBond",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "treasury",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isActive",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "Staked",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "newBond", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Unstaked",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "newBond", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Slashed",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "newBond", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
] as const;

/** All SpartArena contract ABIs keyed by contract name. */
export const spartArenaAbis = {
  AgentRegistry: agentRegistryAbi,
  TaskEscrow: taskEscrowAbi,
  DecisionLedger: decisionLedgerAbi,
  ReputationEngine: reputationEngineAbi,
  SkillRegistry: skillRegistryAbi,
  AgentStaking: agentStakingAbi,
} as const;
