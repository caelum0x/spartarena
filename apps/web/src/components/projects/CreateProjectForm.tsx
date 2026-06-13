"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { z } from "zod";
import { SKILLS } from "@spartarena/shared";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/hooks/useWriteContracts";
import { useToast } from "@/components/providers/ToastProvider";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(140),
  summary: z.string().min(1, "Summary is required").max(3000),
  sponsorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 0x address"),
  treasuryMnt: z
    .string()
    .regex(/^\d*\.?\d+$/, "Enter a positive amount")
    .refine((value) => Number(value) >= 0, "Treasury must be zero or greater"),
  deadlineDays: z
    .string()
    .regex(/^\d+$/, "Enter a whole number of days")
    .refine((value) => Number(value) >= 1, "At least 1 day"),
  requiredSkills: z.array(z.string()).min(1, "Select at least one skill"),
});

export function CreateProjectForm() {
  const router = useRouter();
  const { address, isConnected, connectWallet } = useWallet();
  const { push } = useToast();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sponsorWallet, setSponsorWallet] = useState(address ?? "");
  const [treasuryMnt, setTreasuryMnt] = useState("10");
  const [deadlineDays, setDeadlineDays] = useState("7");
  const [requiredSkills, setRequiredSkills] = useState<readonly string[]>([
    "ALPHA_DETECTION",
    "CONTRACT_AUDIT",
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (address && sponsorWallet.length === 0) {
      setSponsorWallet(address);
    }
  }, [address, sponsorWallet.length]);

  const toggleSkill = (code: string) => {
    setRequiredSkills((current) =>
      current.includes(code) ? current.filter((skill) => skill !== code) : [...current, code],
    );
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const parsed = formSchema.safeParse({
      title,
      summary,
      sponsorWallet,
      treasuryMnt,
      deadlineDays,
      requiredSkills,
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

    setSubmitting(true);
    try {
      const deadline = Math.floor(Date.now() / 1000) + Number(parsed.data.deadlineDays) * 86_400;
      const project = await api.createProject({
        title: parsed.data.title,
        summary: parsed.data.summary,
        sponsorWallet: parsed.data.sponsorWallet,
        treasuryWei: parseEther(parsed.data.treasuryMnt).toString(),
        requiredSkills: parsed.data.requiredSkills,
        deadline,
      });
      push({
        variant: "success",
        title: "Project created",
        description: "Your sponsor workstream is ready for Battles.",
      });
      router.push(`/projects/${project.slug}`);
    } catch (error: unknown) {
      push({
        variant: "error",
        title: "Project creation failed",
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Input
          label="Project title"
          name="title"
          placeholder="Mantle Alpha Operations"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={errors.title}
        />
        <Textarea
          label="Summary"
          name="summary"
          placeholder="Describe the campaign, what Battles belong here, and how success will be judged."
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          error={errors.summary}
          className="min-h-36"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Sponsor wallet"
            name="sponsorWallet"
            placeholder="0x..."
            value={sponsorWallet}
            onChange={(event) => setSponsorWallet(event.target.value)}
            error={errors.sponsorWallet}
            hint="Used for ownership, filtering and sponsor identity"
          />
          <Input
            label="Treasury budget (MNT)"
            name="treasuryMnt"
            inputMode="decimal"
            value={treasuryMnt}
            onChange={(event) => setTreasuryMnt(event.target.value)}
            error={errors.treasuryMnt}
          />
        </div>
        <Input
          label="Deadline (days)"
          name="deadlineDays"
          inputMode="numeric"
          value={deadlineDays}
          onChange={(event) => setDeadlineDays(event.target.value)}
          error={errors.deadlineDays}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-foreground/90">Required skills</p>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((skill) => {
              const selected = requiredSkills.includes(skill.code);
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
          {errors.requiredSkills && (
            <p className="mt-2 text-xs text-crimson-soft">{errors.requiredSkills}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-muted">
            Projects are off-chain sponsor workstreams; each Battle still settles proofs and payouts independently.
          </p>
          <Button type="submit" loading={submitting}>
            {isConnected ? "Create Project" : "Connect & Create"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
