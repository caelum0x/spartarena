import { prisma } from "../../db.js";

/**
 * Persistent indexer cursor.
 *
 * Stores the last fully-scanned block per chain so the poller resumes
 * incrementally across restarts instead of re-scanning genesis. Reads/writes go
 * through a single upserted row keyed by chain id.
 */
export const cursorRepository = {
  async get(chainId: number): Promise<bigint | null> {
    const row = await prisma.indexerCursor.findUnique({ where: { chainId } });
    return row ? row.lastBlockNumber : null;
  },

  async set(chainId: number, blockNumber: bigint): Promise<void> {
    await prisma.indexerCursor.upsert({
      where: { chainId },
      create: { chainId, lastBlockNumber: blockNumber },
      update: { lastBlockNumber: blockNumber },
    });
  },
};
