import { z } from "zod";

const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");

const numericString = z
  .string()
  .regex(/^\d+$/, "treasuryWei must be a base-10 integer string");

export const projectIdParamSchema = z.object({ id: z.string().min(1) });

export const listProjectsQuerySchema = z.object({
  status: z.enum(["PLANNING", "ACTIVE", "SETTLED", "ARCHIVED"]).optional(),
  sponsor: addressSchema.optional(),
  skill: z.string().min(1).optional(),
});

export const createProjectSchema = z.object({
  title: z.string().min(1).max(140),
  summary: z.string().min(1).max(3000),
  sponsorWallet: addressSchema,
  treasuryWei: numericString.default("0"),
  requiredSkills: z.array(z.string().min(1)).max(16).default([]),
  deadline: z.number().int().positive().optional(),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case")
    .optional(),
});

export const updateProjectSchema = z
  .object({
    title: z.string().min(1).max(140).optional(),
    summary: z.string().min(1).max(3000).optional(),
    treasuryWei: numericString.optional(),
    status: z.enum(["PLANNING", "ACTIVE", "SETTLED", "ARCHIVED"]).optional(),
    requiredSkills: z.array(z.string().min(1)).max(16).optional(),
    deadline: z.number().int().positive().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
