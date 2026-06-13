import "dotenv/config";
import { type Address, type Hex } from "viem";
import { getProvider, type LlmProvider } from "./llm/provider.js";
import { MantleReader } from "./tools/mantle.js";
import { AssetDataTool, type AssetSymbol } from "./tools/assets.js";
import { AlphaSentinelAgent } from "./agents/AlphaSentinelAgent.js";
import { YieldStrategistAgent } from "./agents/YieldStrategistAgent.js";
import { ByrealPoolAnalysisAgent } from "./agents/ByrealPoolAnalysisAgent.js";
import { ContractAuditAgent } from "./agents/ContractAuditAgent.js";
import { hashDecision } from "./hash.js";
import { scoreOutput } from "./verifier.js";
import { ChainWriter } from "./chain/writer.js";
import type { AgentRun } from "./agents/BaseAgent.js";
import type { AgentOutput } from "./schemas.js";

const ONCHAIN = process.argv.includes("--onchain");

function header(title: string) {
  console.log(`\n\x1b[36m━━ ${title} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
}

async function main() {
  console.log("\x1b[35m⚔  SpartArena — agent demo run\x1b[0m");
  console.log(`   mode: ${ONCHAIN ? "ON-CHAIN (writing to Mantle)" : "offline (no chain writes)"}`);

  const llm = getProvider();
  const writer = ONCHAIN ? buildWriter() : undefined;

  await runAlphaSentinel(llm, writer);
  await runYieldStrategist(llm, writer);
  await runByrealPoolAnalyst(llm, writer);
  await runContractAuditor(llm, writer);

  header(ONCHAIN ? "Done — proofs settled on Mantle" : "Done (offline)");
  if (!ONCHAIN) {
    console.log("   Re-run with --onchain and a deployed contract set to write proof to Mantle.");
  }
}

async function runAlphaSentinel(llm: LlmProvider, writer?: ChainWriter): Promise<void> {
  console.log("\n\x1b[35m▣  AlphaSentinel — on-chain alpha detection\x1b[0m");
  const reader = new MantleReader();
  const agent = new AlphaSentinelAgent(llm, reader);

  const taskId = Number(process.env.DEMO_TASK_ID ?? 1);
  const agentId = Number(process.env.DEMO_AGENT_ID ?? 1);

  header("1. Agent enters the arena");
  const started = Date.now();
  const run = await agent.run({
    taskId,
    targetWallet: "0x1111111111111111111111111111111111111111" as Address,
    query: "Detect suspicious wallet activity on Mantle and explain the risk.",
    riskMode: "conservative",
  });
  const elapsedMs = Date.now() - started;
  console.log(`   LLM provider: ${llm.name}   tools used: ${run.toolCalls.length}   elapsed: ${elapsedMs}ms`);
  console.log("   output:", JSON.stringify(run.output, null, 2));

  await proveScoreAndSettle(run, elapsedMs, { taskId, agentId }, writer);
}

async function runYieldStrategist(llm: LlmProvider, writer?: ChainWriter): Promise<void> {
  console.log("\n\x1b[35m▣  YieldStrategist — conservative RWA allocation\x1b[0m");
  const assets = new AssetDataTool();
  const agent = new YieldStrategistAgent(llm, assets);

  const taskId = Number(process.env.DEMO_YIELD_TASK_ID ?? 2);
  const agentId = Number(process.env.DEMO_YIELD_AGENT_ID ?? 2);

  header("1. Agent enters the arena");
  const started = Date.now();
  const run = await agent.run({
    taskId,
    assets: ["MNT", "mETH", "USDY"] as AssetSymbol[],
    goal: "Capital preservation with yield across Mantle-ecosystem assets.",
    riskProfile: "conservative",
  });
  const elapsedMs = Date.now() - started;
  console.log(`   LLM provider: ${llm.name}   tools used: ${run.toolCalls.length}   elapsed: ${elapsedMs}ms`);
  console.log("   output:", JSON.stringify(run.output, null, 2));

  await proveScoreAndSettle(run, elapsedMs, { taskId, agentId }, writer);
}

async function runByrealPoolAnalyst(llm: LlmProvider, writer?: ChainWriter): Promise<void> {
  console.log("\n\x1b[35m▣  ByrealPoolAnalyst — Byreal (Solana) pool comparison\x1b[0m");
  // adapterOptions left to env: BYREAL_MOCK=true selects the deterministic mock,
  // otherwise the REAL Byreal REST client is used.
  const agent = new ByrealPoolAnalysisAgent(llm);

  const taskId = Number(process.env.DEMO_BYREAL_TASK_ID ?? 3);
  const agentId = Number(process.env.DEMO_BYREAL_AGENT_ID ?? 3);

  header("1. Agent enters the arena");
  const started = Date.now();
  const run = await agent.run({
    taskId,
    goal: "Recommend the strongest Byreal pool for a liquidity provider seeking sustainable fee yield.",
    pools: [
      { poolAddress: "So11111111111111111111111111111111111111112", pairLabel: "SOL/USDC" },
      { poolAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", pairLabel: "USDC/USDT" },
      { poolAddress: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", pairLabel: "ETH/USDC" },
    ],
  });
  const elapsedMs = Date.now() - started;
  console.log(`   LLM provider: ${llm.name}   tools used: ${run.toolCalls.length}   elapsed: ${elapsedMs}ms`);
  console.log("   output:", JSON.stringify(run.output, null, 2));

  await proveScoreAndSettle(run, elapsedMs, { taskId, agentId }, writer);
}

async function runContractAuditor(llm: LlmProvider, writer?: ChainWriter): Promise<void> {
  console.log("\n\x1b[35m▣  ContractAuditor — static smart-contract review\x1b[0m");
  // ContractInspector reads from NEXT_PUBLIC_MANTLE_RPC_URL, or uses a
  // deterministic offline path when MANTLE_OFFLINE=true.
  const agent = new ContractAuditAgent(llm);

  const taskId = Number(process.env.DEMO_AUDIT_TASK_ID ?? 4);
  const agentId = Number(process.env.DEMO_AUDIT_AGENT_ID ?? 4);

  header("1. Agent enters the arena");
  const started = Date.now();
  const run = await agent.run({
    taskId,
    target: "0x4444444444444444444444444444444444444444" as Address,
    goal: "Statically review this Mantle contract and flag anything a human should audit.",
  });
  const elapsedMs = Date.now() - started;
  console.log(`   LLM provider: ${llm.name}   tools used: ${run.toolCalls.length}   elapsed: ${elapsedMs}ms`);
  console.log("   output:", JSON.stringify(run.output, null, 2));

  await proveScoreAndSettle(run, elapsedMs, { taskId, agentId }, writer);
}

/**
 * Shared tail: hash the proof, score with the Oracle Judge, and (when a writer
 * is supplied) settle the proof on Mantle. Works for any agent's AgentRun.
 */
async function proveScoreAndSettle(
  run: AgentRun<AgentOutput>,
  elapsedMs: number,
  ids: { taskId: number; agentId: number },
  writer?: ChainWriter,
): Promise<void> {
  header("2. Decision proof (hashes written to Mantle)");
  const hashes = hashDecision(run.prompt, run.output, run.toolCalls);
  console.log("   promptHash:", hashes.promptHash);
  console.log("   outputHash:", hashes.outputHash);
  console.log("   toolsHash :", hashes.toolsHash);

  header("3. Oracle Judge scores the Spartan");
  const score = scoreOutput(run.output, elapsedMs);
  console.log("   accuracy:", score.accuracy, " safety:", score.safety, " speed:", score.speed, " userRating:", score.userRating);

  if (!writer) {
    return;
  }

  const { taskId, agentId } = ids;
  header("4. Writing to Mantle");
  const decisionTx = await writer.recordDecision({
    agentId: BigInt(agentId),
    taskId: BigInt(taskId),
    hashes,
    confidence: run.output.confidence,
    riskScore: run.output.riskScore,
    actionType: run.output.decisionType,
  });
  console.log("   recordDecision tx:", explorer(decisionTx));

  const resultTx = await writer.submitResult(BigInt(taskId), BigInt(agentId), hashes.outputHash);
  console.log("   submitResult   tx:", explorer(resultTx));

  const scoreTx = await writer.submitScore(BigInt(agentId), BigInt(taskId), score);
  console.log("   submitScore    tx:", explorer(scoreTx));
}

function buildWriter(): ChainWriter {
  const req = (k: string): string => {
    const v = process.env[k];
    if (!v) throw new Error(`Missing env ${k} (required for --onchain)`);
    return v;
  };
  return new ChainWriter({
    rpcUrl: req("NEXT_PUBLIC_MANTLE_RPC_URL"),
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 5003),
    privateKey: req("BACKEND_SIGNER_PRIVATE_KEY") as Hex,
    decisionLedger: req("NEXT_PUBLIC_DECISION_LEDGER_ADDRESS") as Address,
    taskEscrow: req("NEXT_PUBLIC_TASK_ESCROW_ADDRESS") as Address,
    reputationEngine: req("NEXT_PUBLIC_REPUTATION_ENGINE_ADDRESS") as Address,
  });
}

function explorer(tx: Hex): string {
  const base = process.env.NEXT_PUBLIC_MANTLE_EXPLORER_URL ?? "https://sepolia.mantlescan.xyz";
  return `${tx}  ->  ${base}/tx/${tx}`;
}

main().catch((err) => {
  console.error("\x1b[31mAgent run failed:\x1b[0m", err);
  process.exit(1);
});
