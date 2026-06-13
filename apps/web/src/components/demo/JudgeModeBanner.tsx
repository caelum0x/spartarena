import { Badge } from "@/components/ui/Badge";

/** Prominent banner orienting a hackathon judge on the guided demo. */
export function JudgeModeBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gold/5 p-6 shadow-glow">
      <div className="absolute inset-0 arena-grid opacity-40" aria-hidden />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge tone="gold">Judge Mode</Badge>
          <h2 className="mt-2 font-display text-xl font-bold text-foreground">
            Idiot-proof, end-to-end walkthrough
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Seven steps take a Spartan from enlistment to the Hall of Glory — Register, Create a
            Battle, Run the agent, Record the proof, Verify, Release the reward, and crown the
            victor. Each step explains exactly what just happened on Mantle.
          </p>
        </div>
      </div>
    </div>
  );
}
