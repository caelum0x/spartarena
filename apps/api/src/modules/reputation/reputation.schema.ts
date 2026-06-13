import { z } from "zod";

/** Request validation for the reputation (Honor) module. */

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  /** Ranking key: by average Glory (default) or by on-chain war-chest bond. */
  sort: z.enum(["glory", "bond"]).default("glory"),
});

export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
