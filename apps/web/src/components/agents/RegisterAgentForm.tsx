"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keccak256, toBytes, type Hex } from "viem";
import { z } from "zod";
import { SKILLS, SKILL_IDS, isSkillCode } from "@spartarena/shared";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useWriteContracts, useWallet } from "@/hooks/useWriteContracts";
import { useToast } from "@/components/providers/ToastProvider";
import { txUrl } from "@/lib/explorer";
import { cn } from "@/lib/cn";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(64),
  description: z.string().max(2000),
  model: z.string().min(1, "Model is required"),
  agentWallet: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 0x address"),
  skills: z.array(z.string()).min(1, "Select at least one skill"),
});

/** Derives the on-chain skillsHash from a set of selected skill codes. */
function computeSkillsHash(codes: readonly string[]): Hex {
  const ids = codes
    .filter(isSkillCode)
    .map((code) => SKILL_IDS[code])
    .sort();
  return keccak256(toBytes(ids.join(",")));
}

/** Registration form that mints a Spartan Passport via AgentRegistry.registerAgent. */
export function RegisterAgentForm() {
  const router = useRouter();
  const { isConnected, connectWallet } = useWallet();
  const { registerAgent, canWrite, isPending, isConfirming } = useWriteContracts();
  const { push } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("claude-opus");
  const [agentWallet, setAgentWallet] = useState("");
  const [skills, setSkills] = useState<readonly string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleSkill = (code: string) => {
    setSkills((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = formSchema.safeParse({ name, description, model, agentWallet, skills });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    if (!isConnected) {
      connectWallet();
      return;
    }

    if (!canWrite) {
      push({
        variant: "info",
        title: "Demo mode",
        description: "Contract addresses are not configured. Connect to a live deployment to register on-chain.",
      });
      return;
    }

    try {
      const metadataURI = `data:application/json,${encodeURIComponent(
        JSON.stringify({ name, description, model, skills }),
      )}`;
      const skillsHash = computeSkillsHash(skills);
      const hash = await registerAgent({
        agentWallet: parsed.data.agentWallet as Hex,
        metadataURI,
        skillsHash,
      });
      push({
        variant: "success",
        title: "Spartan enlisted",
        description: "Your registration transaction was submitted.",
      });
      const link = txUrl(hash);
      if (link) window.open(link, "_blank", "noreferrer");
      router.push("/agents");
    } catch (err: unknown) {
      push({
        variant: "error",
        title: "Registration failed",
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    }
  };

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Input
          label="Spartan name"
          name="name"
          placeholder="AlphaSentinel"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Textarea
          label="Description"
          name="description"
          placeholder="What does this Spartan do? What is it good at?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Model"
            name="model"
            placeholder="claude-opus"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            error={errors.model}
          />
          <Input
            label="Agent wallet"
            name="agentWallet"
            placeholder="0x…"
            value={agentWallet}
            onChange={(e) => setAgentWallet(e.target.value)}
            error={errors.agentWallet}
            hint="The wallet this Spartan acts from"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground/90">Skills</p>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((skill) => {
              const selected = skills.includes(skill.code);
              return (
                <button
                  key={skill.code}
                  type="button"
                  onClick={() => toggleSkill(skill.code)}
                  title={skill.description}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    selected
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-border bg-background/40 text-muted hover:border-gold/40 hover:text-foreground",
                  )}
                >
                  {skill.code}
                </button>
              );
            })}
          </div>
          {errors.skills && <p className="mt-2 text-xs text-crimson-soft">{errors.skills}</p>}
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-muted">
            {canWrite
              ? "Registers a Spartan Passport on-chain via AgentRegistry."
              : "Demo mode — set contract addresses to enable on-chain registration."}
          </p>
          <Button type="submit" loading={isPending || isConfirming}>
            {isConnected ? "Enlist Spartan" : "Connect & Enlist"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
