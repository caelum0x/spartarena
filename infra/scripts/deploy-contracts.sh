#!/usr/bin/env bash
# Deploy the SpartArena contracts to a target network and sync ABIs + addresses
# into the apps that consume them.
set -euo pipefail
cd "$(dirname "$0")/../../packages/contracts"

NETWORK="${1:-localhost}"

echo "==> Deploying contracts to: ${NETWORK}"
if [ "$NETWORK" = "mantle_sepolia" ]; then
  forge script script/Deploy.s.sol:Deploy --rpc-url mantle_sepolia --broadcast --verify --slow
else
  forge script script/Deploy.s.sol:Deploy --rpc-url localhost --broadcast
fi

echo "==> Exporting ABIs"
mkdir -p abi
for c in AgentRegistry TaskEscrow DecisionLedger ReputationEngine SkillRegistry AgentStaking; do
  forge inspect "src/${c}.sol:${c}" abi > "abi/${c}.json"
done

echo "==> Deployment written to packages/contracts/deployments/. Update apps/*/.env with the addresses."
