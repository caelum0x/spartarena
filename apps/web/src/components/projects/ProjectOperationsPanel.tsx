"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { parseEther } from "viem";
import { SKILLS } from "@spartarena/shared";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/providers/ToastProvider";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnt } from "@/lib/format";
import type { ProjectStatusView, ProjectView } from "@/types";

const STATUSES: readonly ProjectStatusView[] = ["PLANNING", "ACTIVE", "SETTLED", "ARCHIVED"];

function mntFromWei(wei: string): string {
  const value = BigInt(/^\d+$/.test(wei) ? wei : "0");
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction.length > 0 ? `${whole}.${fraction.slice(0, 6)}` : whole.toString();
}

export function ProjectOperationsPanel({ project }: { project: ProjectView }) {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [status, setStatus] = useState<ProjectStatusView>(project.status);
  const [treasuryMnt, setTreasuryMnt] = useState(mntFromWei(project.treasuryWei));
  const [summary, setSummary] = useState(project.summary);
  const [skills, setSkills] = useState<readonly string[]>(project.requiredSkills);
  const [deadlineDays, setDeadlineDays] = useState("");
  const [saving, setSaving] = useState(false);

  const changed = useMemo(
    () =>
      status !== project.status ||
      treasuryMnt !== mntFromWei(project.treasuryWei) ||
      summary !== project.summary ||
      skills.join(",") !== project.requiredSkills.join(",") ||
      deadlineDays.trim().length > 0,
    [deadlineDays, project, skills, status, summary, treasuryMnt],
  );

  const toggleSkill = (code: string) => {
    setSkills((current) =>
      current.includes(code) ? current.filter((skill) => skill !== code) : [...current, code],
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const deadline =
        deadlineDays.trim().length > 0
          ? Math.floor(Date.now() / 1000) + Number(deadlineDays) * 86_400
          : undefined;
      const updated = await api.updateProject(project.slug, {
        status,
        treasuryWei: parseEther(treasuryMnt || "0").toString(),
        summary,
        requiredSkills: skills,
        ...(deadline !== undefined ? { deadline } : {}),
      });
      queryClient.setQueryData(["project", project.slug], { data: updated, source: "api" });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["project", project.slug] });
      push({
        variant: "success",
        title: "Project updated",
        description: `${updated.title} is now ${updated.status.toLowerCase()}.`,
      });
      setDeadlineDays("");
    } catch (error: unknown) {
      push({
        variant: "error",
        title: "Project update failed",
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Project Operations</h2>
          <p className="mt-1 text-sm text-muted">
            Update campaign status, treasury intent and skill requirements for this sponsor workstream.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background/40 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-wider text-muted">Current Treasury</p>
          <p className="mt-1 font-display text-lg font-semibold text-gold">
            {formatMnt(project.treasuryWei)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground/90">Lifecycle status</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    status === item
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-border bg-background/35 text-muted hover:text-foreground",
                  )}
                >
                  {item[0] + item.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Treasury budget (MNT)"
            inputMode="decimal"
            value={treasuryMnt}
            onChange={(event) => setTreasuryMnt(event.target.value)}
          />
          <Input
            label="Extend deadline by days"
            inputMode="numeric"
            placeholder="Leave unchanged"
            value={deadlineDays}
            onChange={(event) => setDeadlineDays(event.target.value)}
          />
        </div>

        <div className="space-y-5">
          <Textarea
            label="Project summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className="min-h-32"
          />
          <div>
            <p className="mb-2 text-sm font-medium text-foreground/90">Required skills</p>
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
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="button" onClick={save} loading={saving} disabled={!changed}>
          Save Project
        </Button>
      </div>
    </Card>
  );
}
