"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseEther } from "viem";
import { z } from "zod";
import { SKILLS } from "@spartarena/shared";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useWriteContracts, useWallet } from "@/hooks/useWriteContracts";
import { useToast } from "@/components/providers/ToastProvider";
import { hashString, shortHash } from "@/lib/hash";
import { txUrl } from "@/lib/explorer";
import { useProjects } from "@/hooks/useProjects";
import { api } from "@/lib/api";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().min(1, "Description is required").max(4000),
  rewardMnt: z
    .string()
    .regex(/^\d*\.?\d+$/, "Enter a positive amount")
    .refine((v) => Number(v) > 0, "Reward must be greater than zero"),
  deadlineDays: z
    .string()
    .regex(/^\d+$/, "Enter a whole number of days")
    .refine((v) => Number(v) >= 1, "At least 1 day"),
  requiredSkill: z.string().optional(),
});

/** Create Battle form — posts a task and locks the MNT reward in the Vault. */
export function CreateBattleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected, connectWallet } = useWallet();
  const { createTask, canWrite, isPending, isConfirming } = useWriteContracts();
  const { data: projectsData } = useProjects();
  const { push } = useToast();

  const projects = projectsData?.data ?? [];
  const initialProject = searchParams.get("project") ?? "";
  const [title, setTitle] = useState(searchParams.get("title") ?? "");
  const [description, setDescription] = useState(searchParams.get("description") ?? "");
  const [rewardMnt, setRewardMnt] = useState(searchParams.get("reward") ?? "");
  const [deadlineDays, setDeadlineDays] = useState(searchParams.get("days") ?? "3");
  const [requiredSkill, setRequiredSkill] = useState(searchParams.get("skill") ?? "");
  const [projectId, setProjectId] = useState(initialProject);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiSubmitting, setApiSubmitting] = useState(false);

  const descriptionHash = useMemo(
    () => (description ? hashString(`${title}\n${description}`) : undefined),
    [title, description],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = formSchema.safeParse({
      title,
      description,
      rewardMnt,
      deadlineDays,
      requiredSkill: requiredSkill || undefined,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (!isConnected) {
      connectWallet();
      return;
    }
    try {
      const deadlineUnix =
        BigInt(Math.floor(Date.now() / 1000)) + BigInt(Number(deadlineDays) * 86_400);
      const selectedProject = projects.find((project) => project.id === projectId || project.slug === projectId);

      if (canWrite) {
        const hash = await createTask({
          description: `${title}\n${description}`,
          rewardMnt: parsed.data.rewardMnt,
          deadlineUnix,
        });
        const link = txUrl(hash);
        if (link) window.open(link, "_blank", "noreferrer");
      }

      if (selectedProject) {
        setApiSubmitting(true);
        await api.createProjectBattle(selectedProject.id, {
          title: parsed.data.title,
          description: parsed.data.description,
          creatorWallet: address ?? "0x0000000000000000000000000000000000000000",
          rewardWei: parseEther(parsed.data.rewardMnt).toString(),
          deadline: Number(deadlineUnix),
          ...(parsed.data.requiredSkill ? { requiredSkill: parsed.data.requiredSkill } : {}),
        });
        push({
          variant: "success",
          title: canWrite ? "Battle posted and attached" : "Battle added to Project",
          description: selectedProject.title,
        });
        router.push(`/projects/${selectedProject.slug}`);
        return;
      }

      if (!canWrite) {
        push({
          variant: "info",
          title: "Demo mode",
          description: "Select a Project to create an off-chain Battle, or configure contracts for on-chain posting.",
        });
        return;
      }

      push({ variant: "success", title: "Battle posted", description: "Reward locked in the Vault." });
      router.push("/arena");
    } catch (err: unknown) {
      push({
        variant: "error",
        title: "Failed to post Battle",
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setApiSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Input
          label="Battle title"
          name="title"
          placeholder="Detect anomalous MNT whale flows in the last 24h"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />
        <Textarea
          label="Description"
          name="description"
          placeholder="Describe the job. Be specific about inputs, outputs and what success looks like."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          className="min-h-36"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Reward (MNT)"
            name="rewardMnt"
            inputMode="decimal"
            placeholder="5.0"
            value={rewardMnt}
            onChange={(e) => setRewardMnt(e.target.value)}
            error={errors.rewardMnt}
            hint="Locked in the Battle Vault until settled"
          />
          <Input
            label="Deadline (days)"
            name="deadlineDays"
            inputMode="numeric"
            placeholder="3"
            value={deadlineDays}
            onChange={(e) => setDeadlineDays(e.target.value)}
            error={errors.deadlineDays}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="projectId" className="text-sm font-medium text-foreground/90">
            Project (optional)
          </label>
          <select
            id="projectId"
            name="projectId"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background/60 px-3.5 text-sm text-foreground focus:border-gold/60 focus:outline-none focus:ring-1 focus:ring-gold/40"
          >
            <option value="">Standalone Battle</option>
            {projects.map((project) => (
              <option key={project.id} value={project.slug}>
                {project.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">
            Project Battles appear in the sponsor workstream while keeping their own proof and reward flow.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="requiredSkill" className="text-sm font-medium text-foreground/90">
            Required skill (optional)
          </label>
          <select
            id="requiredSkill"
            name="requiredSkill"
            value={requiredSkill}
            onChange={(e) => setRequiredSkill(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background/60 px-3.5 text-sm text-foreground focus:border-gold/60 focus:outline-none focus:ring-1 focus:ring-gold/40"
          >
            <option value="">Any skill</option>
            {SKILLS.map((skill) => (
              <option key={skill.code} value={skill.code}>
                {skill.code}
              </option>
            ))}
          </select>
        </div>

        {descriptionHash && (
          <div className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">
            <span className="text-muted">descriptionHash · </span>
            <code className="font-mono text-gold">{shortHash(descriptionHash)}</code>
            <span className="text-muted"> — committed on-chain, full text stays off-chain</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="submit" loading={isPending || isConfirming || apiSubmitting}>
            {isConnected ? "Post Battle & Lock Reward" : "Connect & Post"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
