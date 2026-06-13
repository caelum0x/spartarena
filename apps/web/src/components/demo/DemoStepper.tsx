"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { keccak256, toBytes } from "viem";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DemoActionButton } from "./DemoActionButton";
import { HashViewer } from "@/components/decisions/HashViewer";
import { ReputationBreakdown } from "@/components/leaderboard/ReputationBreakdown";
import { cn } from "@/lib/cn";

interface DemoStep {
  readonly id: number;
  readonly label: string;
  readonly title: string;
  readonly action: string;
  readonly explanation: string;
}

const STEPS: readonly DemoStep[] = [
  {
    id: 0,
    label: "Register",
    title: "Enlist a Spartan",
    action: "Register AlphaSentinel",
    explanation:
      "Mints a Spartan Passport on AgentRegistry. The agent's wallet, metadata and a keccak256 commitment of its skills are written on Mantle.",
  },
  {
    id: 1,
    label: "Create",
    title: "Post a Battle",
    action: "Create Battle (5 MNT)",
    explanation:
      "A user posts a job and locks the reward in the Battle Vault (TaskEscrow). Only the descriptionHash goes on-chain — the full brief stays off-chain.",
  },
  {
    id: 2,
    label: "Run",
    title: "Run the agent",
    action: "Run AlphaSentinel",
    explanation:
      "The Spartan reads Mantle data, reasons with its LLM, and produces a structured, schema-validated output with a confidence and risk score.",
  },
  {
    id: 3,
    label: "Record",
    title: "Record the proof",
    action: "Record Decision",
    explanation:
      "The hashes of the prompt, output and tool calls are committed to DecisionLedger — a tamper-evident War Chronicle entry anyone can later verify.",
  },
  {
    id: 4,
    label: "Verify",
    title: "Oracle Judge verifies",
    action: "Verify Result",
    explanation:
      "The Oracle Judge confirms the submitted result matches the recorded proof and marks the Battle Verified on TaskEscrow.",
  },
  {
    id: 5,
    label: "Release",
    title: "Release the reward",
    action: "Release Reward",
    explanation:
      "The escrowed MNT is released from the Vault to the winning Spartan. Earnings are recorded against its reputation.",
  },
  {
    id: 6,
    label: "Glory",
    title: "Hall of Glory",
    action: "Score & Crown",
    explanation:
      "ReputationEngine scores the Battle (accuracy, safety, speed, user rating). The Spartan's Glory updates and it climbs the Hall of Glory.",
  },
];

type StepState = "idle" | "running" | "done";

const PROMPT_HASH = keccak256(toBytes("demo:prompt:alpha-sentinel:battle-101"));
const OUTPUT_HASH = keccak256(toBytes("demo:output:alpha-alert:3-wallets"));
const TOOLS_HASH = keccak256(toBytes("demo:tools:mantle-reader"));

/** The guided, idiot-proof judge demo: a 7-step stepper with simulated chain actions. */
export function DemoStepper() {
  const [active, setActive] = useState(0);
  const [states, setStates] = useState<readonly StepState[]>(STEPS.map(() => "idle"));

  const setStepState = (index: number, state: StepState) => {
    setStates((current) => current.map((s, i) => (i === index ? state : s)));
  };

  const runStep = (index: number) => {
    setStepState(index, "running");
    // Simulate the on-chain round-trip so judges see realistic progress.
    setTimeout(() => {
      setStepState(index, "done");
      if (index < STEPS.length - 1) {
        setActive(index + 1);
      }
    }, 1100);
  };

  const allDone = states.every((s) => s === "done");

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Stepper rail */}
      <ol className="space-y-1">
        {STEPS.map((step, index) => {
          const state = states[index] ?? "idle";
          const isActive = active === index;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                  isActive
                    ? "border-gold/50 bg-gold/10"
                    : "border-transparent hover:border-border hover:bg-surface/60",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                    state === "done"
                      ? "bg-gold text-background"
                      : isActive
                        ? "bg-gold/20 text-gold"
                        : "bg-surface-2 text-muted",
                  )}
                >
                  {state === "done" ? "✓" : index + 1}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isActive ? "text-foreground" : "text-muted",
                  )}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Active step panel */}
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.3 }}
          >
            <Card glow>
              <div className="flex items-center gap-3">
                <Badge tone="gold">Step {active + 1} of {STEPS.length}</Badge>
                {states[active] === "done" && <Badge tone="success">Complete</Badge>}
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold text-foreground">
                {STEPS[active]?.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {STEPS[active]?.explanation}
              </p>

              <StepDetail index={active} done={states[active] === "done"} />

              <div className="mt-6 flex items-center justify-between">
                <DemoActionButton
                  label={STEPS[active]?.action ?? "Run"}
                  running={states[active] === "running"}
                  done={states[active] === "done"}
                  onClick={() => runStep(active)}
                />
                {active < STEPS.length - 1 && states[active] === "done" && (
                  <button
                    type="button"
                    onClick={() => setActive(active + 1)}
                    className="text-sm font-medium text-gold hover:underline"
                  >
                    Next step →
                  </button>
                )}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 rounded-2xl border border-gold/40 bg-gold/5 p-6 text-center shadow-glow"
          >
            <p className="font-display text-xl font-bold text-gradient-gold">
              Battle complete — proof on-chain, reward paid, Glory earned.
            </p>
            <p className="mt-2 text-sm text-muted">
              That is the full SpartArena loop: a verifiable, paid, reputation-building unit of AI work.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** Renders the step-specific artefacts revealed once a step completes. */
function StepDetail({ index, done }: { index: number; done: boolean }) {
  if (!done) return null;

  if (index === 2) {
    return (
      <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Agent output</p>
        <p className="text-sm text-foreground/90">
          ALPHA_ALERT — Detected 3 wallets accumulating $SPARTA at 6× normal velocity.
        </p>
        <div className="mt-3 flex gap-2">
          <Badge tone="gold">Confidence 88%</Badge>
          <Badge tone="success">Risk 24%</Badge>
        </div>
      </div>
    );
  }

  if (index === 3) {
    return (
      <div className="mt-5 space-y-2">
        <HashViewer label="Prompt hash" hash={PROMPT_HASH} />
        <HashViewer label="Output hash" hash={OUTPUT_HASH} />
        <HashViewer label="Tools hash" hash={TOOLS_HASH} />
      </div>
    );
  }

  if (index === 6) {
    return (
      <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          New Honor breakdown
        </p>
        <ReputationBreakdown accuracy={94} safety={91} speed={88} userRating={90} />
      </div>
    );
  }

  return null;
}
