import { hashDescription } from "../../lib/hash.js";
import { prisma } from "../../db.js";
import { canRead, canWrite } from "../../chain/client.js";
import { env, resolveLlmProvider } from "../../env.js";

/**
 * Demo orchestration for the judge walkthrough.
 *
 * `seed` idempotently ensures a demo Spartan + Battle exist so the guided
 * `/demo` flow always has something to act on. `status` reports the current
 * counts and chain capability so the frontend stepper can reflect real state.
 */

const DEMO_OWNER = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; // anvil[0]
const DEMO_AGENT_WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"; // anvil[1]

export const demoService = {
  async seed(): Promise<{
    agent: { id: string; name: string; slug: string };
    task: { id: string; title: string; rewardWei: string };
    created: { agent: boolean; task: boolean };
  }> {
    const existingAgent = await prisma.agent.findUnique({
      where: { slug: "alpha-sentinel" },
    });
    const agent =
      existingAgent ??
      (await prisma.agent.create({
        data: {
          name: "AlphaSentinel",
          slug: "alpha-sentinel",
          description: "Detects suspicious on-chain activity and raises alerts.",
          ownerWallet: DEMO_OWNER,
          agentWallet: DEMO_AGENT_WALLET,
          skills: ["ALPHA_DETECTION", "TELEGRAM_ALERT"],
          modelProvider: resolveLlmProvider() ?? "unconfigured",
          modelName:
            resolveLlmProvider() === "anthropic"
              ? env.ANTHROPIC_MODEL
              : resolveLlmProvider() === "openai"
                ? env.OPENAI_MODEL
                : "deterministic-v1",
          status: "ACTIVE",
        },
      }));

    const description =
      "Detect suspicious wallet activity on Mantle and explain the risk.";
    const existingTask = await prisma.task.findFirst({
      where: { title: "Detect suspicious wallet activity", creatorWallet: DEMO_OWNER },
    });
    const rewardWei = "50000000000000000"; // 0.05 MNT
    const task =
      existingTask ??
      (await prisma.task.create({
        data: {
          title: "Detect suspicious wallet activity",
          description,
          descriptionHash: hashDescription(description),
          creatorWallet: DEMO_OWNER,
          rewardAmount: rewardWei,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
          status: "OPEN",
          assignedAgent: { connect: { id: agent.id } },
        },
      }));

    return {
      agent: { id: agent.id, name: agent.name, slug: agent.slug },
      task: { id: task.id, title: task.title, rewardWei: task.rewardAmount },
      created: { agent: !existingAgent, task: !existingTask },
    };
  },

  async status(): Promise<{
    agents: number;
    tasks: number;
    decisions: number;
    reputationScores: number;
    chain: { chainId: number; reads: boolean; writes: boolean };
    llm: { provider: string | null; model: string | null };
  }> {
    const [agents, tasks, decisions, reputationScores] = await Promise.all([
      prisma.agent.count(),
      prisma.task.count(),
      prisma.decision.count(),
      prisma.reputationScore.count(),
    ]);
    const provider = resolveLlmProvider() ?? null;
    const model =
      provider === "anthropic"
        ? env.ANTHROPIC_MODEL
        : provider === "openai"
          ? env.OPENAI_MODEL
          : provider === "mock"
            ? "deterministic-v1"
            : null;
    return {
      agents,
      tasks,
      decisions,
      reputationScores,
      chain: { chainId: env.CHAIN_ID, reads: canRead(), writes: canWrite() },
      llm: { provider, model },
    };
  },
};
