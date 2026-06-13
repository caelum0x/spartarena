"use client";

import { TaskStatus } from "@spartarena/sdk";
import type { TaskView } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatMnt } from "@/lib/format";
import { useWriteContracts, useWallet } from "@/hooks/useWriteContracts";
import { usePrices, mntWeiToUsd, formatUsd } from "@/hooks/usePrices";
import { useToast } from "@/components/providers/ToastProvider";
import { txUrl } from "@/lib/explorer";

/**
 * The Battle Vault — shows the escrowed reward and exposes the verify / release
 * actions for the current lifecycle stage. Writes go through wagmi; in demo mode
 * (no addresses) the actions surface an informational toast instead.
 */
export function RewardVault({ task }: { task: TaskView }) {
  const { isConnected, connectWallet } = useWallet();
  const { verifyTask, releasePayment, canWrite, isPending, isConfirming } = useWriteContracts();
  const { data: prices } = usePrices();
  const { push } = useToast();

  const rewardUsd = mntWeiToUsd(task.rewardWei, prices);

  const run = async (
    action: "verify" | "release",
    fn: () => Promise<`0x${string}`>,
  ) => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!canWrite) {
      push({
        variant: "info",
        title: "Demo mode",
        description: "Set contract addresses to perform on-chain Vault actions.",
      });
      return;
    }
    try {
      const hash = await fn();
      push({
        variant: "success",
        title: action === "verify" ? "Verification submitted" : "Payment released",
      });
      const link = txUrl(hash);
      if (link) window.open(link, "_blank", "noreferrer");
    } catch (err: unknown) {
      push({
        variant: "error",
        title: "Action failed",
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    }
  };

  const canVerify = task.status === TaskStatus.Submitted;
  const canRelease = task.status === TaskStatus.Verified;
  const settled = task.status === TaskStatus.Paid;

  return (
    <Card glow>
      <p className="text-xs uppercase tracking-wider text-muted">Battle Vault</p>
      <p className="mt-1 font-display text-3xl font-bold text-gradient-gold">
        {formatMnt(task.rewardWei)}
      </p>
      {rewardUsd !== undefined && (
        <p className="mt-0.5 text-sm text-muted" title="Live CoinGecko MNT price">
          ≈ {formatUsd(rewardUsd)}
        </p>
      )}
      <p className="mt-1 text-xs text-muted">Locked in escrow until the Battle is settled.</p>

      <div className="mt-5 flex flex-col gap-3">
        <Button
          variant="primary"
          disabled={!canVerify}
          loading={canVerify && (isPending || isConfirming)}
          onClick={() => run("verify", () => verifyTask(BigInt(task.taskId)))}
        >
          {settled ? "Verified" : "Verify Result (Oracle Judge)"}
        </Button>
        <Button
          variant="secondary"
          disabled={!canRelease}
          loading={canRelease && (isPending || isConfirming)}
          onClick={() => run("release", () => releasePayment(BigInt(task.taskId)))}
        >
          {settled ? "Reward Released" : "Release Reward"}
        </Button>
      </div>

      {!canWrite && (
        <p className="mt-4 rounded-lg border border-border bg-background/40 p-3 text-xs text-muted">
          Running in demo mode. Connect to a live Mantle deployment with configured
          contract addresses to settle Battles on-chain.
        </p>
      )}
    </Card>
  );
}
