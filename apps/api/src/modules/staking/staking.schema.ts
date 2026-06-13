import { z } from "zod";

/** Path param: numeric agent id. */
export const stakingAgentParamSchema = z.object({
  id: z.coerce.bigint().nonnegative(),
});

export type StakingAgentParam = z.infer<typeof stakingAgentParamSchema>;
