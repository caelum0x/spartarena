import { PrismaClient } from "@prisma/client";
import { keccak256, toBytes } from "viem";

/**
 * Seed a demo Spartan + Battle so a fresh database has something to demo with.
 *
 * Idempotent: re-running upserts rather than duplicating. Mirrors the demo
 * service's seed so `pnpm db:seed` and `POST /demo/seed` agree. Uses anvil's
 * default accounts as owner/agent wallets for local development.
 */
const prisma = new PrismaClient();

const DEMO_OWNER = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; // anvil[0]
const DEMO_AGENT_WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"; // anvil[1]

function hashString(value: string): string {
  return keccak256(toBytes(value));
}

async function main(): Promise<void> {
  const project = await prisma.project.upsert({
    where: { slug: "mantle-alpha-ops" },
    update: {},
    create: {
      title: "Mantle Alpha Operations",
      slug: "mantle-alpha-ops",
      summary:
        "A sponsor workstream for monitoring wallet flows, yield opportunities and contract risk before capital is moved on Mantle.",
      sponsorWallet: DEMO_OWNER,
      treasuryWei: "15000000000000000000", // 15 MNT
      requiredSkills: ["ALPHA_DETECTION", "RWA_STRATEGY", "CONTRACT_AUDIT"],
      status: "ACTIVE",
      deadline: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 3600),
    },
  });

  const agent = await prisma.agent.upsert({
    where: { slug: "alpha-sentinel" },
    update: {},
    create: {
      name: "AlphaSentinel",
      slug: "alpha-sentinel",
      description: "Detects suspicious on-chain activity and raises alerts.",
      ownerWallet: DEMO_OWNER,
      agentWallet: DEMO_AGENT_WALLET,
      skills: ["ALPHA_DETECTION", "TELEGRAM_ALERT"],
      modelProvider: "mock",
      modelName: "deterministic-v1",
      status: "ACTIVE",
    },
  });

  const description = "Detect suspicious wallet activity on Mantle and explain the risk.";
  const existingTask = await prisma.task.findFirst({
    where: { title: "Detect suspicious wallet activity", creatorWallet: DEMO_OWNER },
  });

  const task =
    existingTask ??
    (await prisma.task.create({
      data: {
        title: "Detect suspicious wallet activity",
        description,
        descriptionHash: hashString(description),
        requiredSkill: "ALPHA_DETECTION",
        creatorWallet: DEMO_OWNER,
        project: { connect: { id: project.id } },
        rewardAmount: "50000000000000000", // 0.05 MNT
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
        status: "OPEN",
        assignedAgent: { connect: { id: agent.id } },
      },
    }));

  if (task.projectId !== project.id) {
    await prisma.task.update({ where: { id: task.id }, data: { projectId: project.id } });
  }
  if (task.requiredSkill === null) {
    await prisma.task.update({ where: { id: task.id }, data: { requiredSkill: "ALPHA_DETECTION" } });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded Project "${project.title}" (${project.id}), Spartan "${agent.name}" (${agent.id}) and Battle "${task.title}" (${task.id}).`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
