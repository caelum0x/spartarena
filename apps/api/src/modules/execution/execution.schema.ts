import { z } from "zod";

/** Request validation for the execution module. */

/** Body for `POST /agents/:id/run-demo`. */
export const runDemoForAgentSchema = z.object({
  /** Free-text Battle prompt; defaults to a canned demo prompt when omitted. */
  description: z.string().min(1).max(4000).optional(),
  /** Optional task to associate the produced decision with. */
  taskId: z.string().min(1).optional(),
});

/** Body for the demo run-* endpoints. */
export const runAgentSchema = z.object({
  taskId: z.string().min(1).optional(),
  description: z.string().min(1).max(4000).optional(),
});

export type RunDemoForAgentInput = z.infer<typeof runDemoForAgentSchema>;
export type RunAgentInput = z.infer<typeof runAgentSchema>;
