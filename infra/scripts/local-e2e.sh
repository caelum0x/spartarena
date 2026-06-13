#!/usr/bin/env bash
# SpartArena local end-to-end proof:
#   anvil -> deploy 5 contracts -> register a Spartan -> post a battle ->
#   run AlphaSentinel --onchain (records decision, submits result, scores) ->
#   read back reputation. Proves the REAL on-chain write path with no mocks
#   on the contract side. The agent's LLM/market reads use whatever is configured
#   in apps/agent-runner/.env (real keys -> real inference; else mock+offline).
set -euo pipefail
cd "$(dirname "$0")/../.."

ROOT="$(pwd)"
CONTRACTS="$ROOT/packages/contracts"
RUNNER="$ROOT/apps/agent-runner"

# Anvil account #0 (well-known dev key) — local only, never used on a real network.
DEPLOYER_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER_ADDR="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
RPC="http://127.0.0.1:8545"

cleanup() { [ -n "${ANVIL_PID:-}" ] && kill "$ANVIL_PID" 2>/dev/null || true; }
trap cleanup EXIT

echo "==> Starting anvil"
anvil --silent &
ANVIL_PID=$!
until cast block-number --rpc-url "$RPC" >/dev/null 2>&1; do sleep 0.3; done

echo "==> Deploying contracts"
cd "$CONTRACTS"
DEPLOYER_PRIVATE_KEY="$DEPLOYER_PK" \
  forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC" --broadcast >/tmp/spartarena-deploy.log 2>&1 \
  || { echo "deploy failed"; tail -30 /tmp/spartarena-deploy.log; exit 1; }

DEPLOY_JSON="$CONTRACTS/deployments/31337.json"
get() { node -e "process.stdout.write(require('$DEPLOY_JSON').$1)"; }
AGENT_REGISTRY="$(get AgentRegistry)"
TASK_ESCROW="$(get TaskEscrow)"
DECISION_LEDGER="$(get DecisionLedger)"
REPUTATION_ENGINE="$(get ReputationEngine)"
echo "    AgentRegistry=$AGENT_REGISTRY"
echo "    TaskEscrow=$TASK_ESCROW"
echo "    DecisionLedger=$DECISION_LEDGER"
echo "    ReputationEngine=$REPUTATION_ENGINE"

echo "==> Registering a Spartan (agentId 1, wallet = deployer)"
cast send "$AGENT_REGISTRY" \
  "registerAgent(address,string,bytes32)" \
  "$DEPLOYER_ADDR" "ipfs://demo-alpha-sentinel" \
  "$(cast keccak ALPHA_DETECTION)" \
  --private-key "$DEPLOYER_PK" --rpc-url "$RPC" >/dev/null
echo "    agentCount=$(cast call "$AGENT_REGISTRY" 'agentCount()(uint256)' --rpc-url "$RPC")"

echo "==> Posting a battle (taskId 1, 0.05 ETH escrow, +1h deadline)"
DEADLINE=$(( $(date +%s) + 3600 ))
cast send "$TASK_ESCROW" \
  "createTask(bytes32,uint256)" \
  "$(cast keccak 'Detect suspicious wallet activity on Mantle')" "$DEADLINE" \
  --value 0.05ether --private-key "$DEPLOYER_PK" --rpc-url "$RPC" >/dev/null
echo "    taskCount=$(cast call "$TASK_ESCROW" 'taskCount()(uint256)' --rpc-url "$RPC")"

echo "==> Accepting the battle for agent 1 (backend writer = deployer)"
cast send "$TASK_ESCROW" "acceptTask(uint256,uint256)" 1 1 \
  --private-key "$DEPLOYER_PK" --rpc-url "$RPC" >/dev/null

echo "==> Running AlphaSentinel --onchain (writes real proof)"
cd "$RUNNER"
DEMO_TASK_ID=1 DEMO_AGENT_ID=1 \
NEXT_PUBLIC_MANTLE_RPC_URL="$RPC" \
NEXT_PUBLIC_CHAIN_ID=31337 \
BACKEND_SIGNER_PRIVATE_KEY="$DEPLOYER_PK" \
NEXT_PUBLIC_DECISION_LEDGER_ADDRESS="$DECISION_LEDGER" \
NEXT_PUBLIC_TASK_ESCROW_ADDRESS="$TASK_ESCROW" \
NEXT_PUBLIC_REPUTATION_ENGINE_ADDRESS="$REPUTATION_ENGINE" \
LLM_PROVIDER="${LLM_PROVIDER:-mock}" \
MANTLE_OFFLINE="${MANTLE_OFFLINE:-true}" \
  node --import tsx src/demo.ts --onchain

echo "==> Verifying on-chain state"
cd "$CONTRACTS"
echo "    decisionCount=$(cast call "$DECISION_LEDGER" 'decisionCount()(uint256)' --rpc-url "$RPC")"
echo "    reputation(agent 1)=$(cast call "$REPUTATION_ENGINE" 'getReputation(uint256)' 1 --rpc-url "$RPC")"

echo "==> Local end-to-end proof complete."
