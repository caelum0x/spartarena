/** Minimal ABIs for the writes the agent runner performs. */

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
] as const;

export const taskEscrowAbi = [
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
] as const;
