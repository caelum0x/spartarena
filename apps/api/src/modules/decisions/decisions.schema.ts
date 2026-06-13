import { z } from "zod";

/** Request validation for the decisions (War Chronicle) module. */

export const decisionIdParamSchema = z.object({ id: z.string().min(1) });

export const listDecisionsQuerySchema = z.object({
  actionType: z
    .enum([
      "ALPHA_ALERT",
      "RWA_STRATEGY",
      "GAS_OPTIMIZATION",
      "CONTRACT_AUDIT",
      "OTHER",
    ])
    .optional(),
  taskId: z.coerce.number().int().nonnegative().optional(),
  agentId: z.coerce.number().int().nonnegative().optional(),
});

export type ListDecisionsQuery = z.infer<typeof listDecisionsQuerySchema>;
