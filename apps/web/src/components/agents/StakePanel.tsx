"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { contractAbis, contractAddresses } from "@/config/contracts";

interface StakePanelProps {
  readonly agentId: number;
}

/**
 * The Spartan "War Chest" — an agent owner posts a slashable MNT bond on the
 * AgentStaking contract. Reads bond + active status from chain; stake/unstake are
 * real wallet transactions. Renders a read-only notice when staking isn't configured.
 */
export function StakePanel({ agentId }: StakePanelProps) {
  const staking = contractAddresses?.AgentStaking;
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("0.05");
  const [formError, setFormError] = useState<string | null>(null);

  const bondQuery = useReadContract(
    staking
      ? {
          address: staking,
          abi: contractAbis.AgentStaking,
          functionName: "bondOf",
          args: [BigInt(agentId)],
        }
      : undefined,
  );
  const activeQuery = useReadContract(
    staking
      ? {
          address: staking,
          abi: contractAbis.AgentStaking,
          functionName: "isActive",
          args: [BigInt(agentId)],
        }
      : undefined,
  );
  const minBondQuery = useReadContract(
    staking
      ? { address: staking, abi: contractAbis.AgentStaking, functionName: "minBond" }
      : undefined,
  );

  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const bond = (bondQuery.data as bigint | undefined) ?? 0n;
  const isActive = (activeQuery.data as boolean | undefined) ?? false;
  const minBond = (minBondQuery.data as bigint | undefined) ?? 0n;
  const busy = isPending || isConfirming;

  /** Parse the amount input to wei, or null when it is empty/invalid. */
  function parsedWei(): bigint | null {
    try {
      const wei = parseEther((amount || "0").trim());
      return wei > 0n ? wei : null;
    } catch {
      return null;
    }
  }

  async function stake() {
    if (!staking) return;
    const value = parsedWei();
    if (value === null) {
      setFormError("Enter a positive MNT amount.");
      return;
    }
    setFormError(null);
    try {
      await writeContractAsync({
        address: staking,
        abi: contractAbis.AgentStaking,
        functionName: "stake",
        args: [BigInt(agentId)],
        value,
      });
      void bondQuery.refetch();
      void activeQuery.refetch();
    } catch {
      // wallet rejection / revert — surfaced via the `error` from useWriteContract
    }
  }

  async function unstake() {
    if (!staking) return;
    const value = parsedWei();
    if (value === null) {
      setFormError("Enter a positive MNT amount.");
      return;
    }
    setFormError(null);
    try {
      await writeContractAsync({
        address: staking,
        abi: contractAbis.AgentStaking,
        functionName: "unstake",
        args: [BigInt(agentId), value],
      });
      void bondQuery.refetch();
      void activeQuery.refetch();
    } catch {
      // wallet rejection / revert — surfaced via the `error` from useWriteContract
    }
  }

  return (
    <Card className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">War Chest</h2>
        {staking ? (
          <Badge tone={isActive ? "gold" : "muted"}>{isActive ? "Bonded & Active" : "Below minimum"}</Badge>
        ) : (
          <Badge tone="muted">Not configured</Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        A slashable MNT bond signalling this Spartan&apos;s commitment. The Oracle Judge can slash
        it for dishonourable conduct. Only the agent&apos;s owner can stake or withdraw.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Stat label="Bonded" value={`${formatEther(bond)} MNT`} />
        <Stat label="Minimum bond" value={`${formatEther(minBond)} MNT`} hint={isActive ? "met" : "not met"} />
      </div>

      {staking ? (
        <div className="mt-5 space-y-3">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.05"
            aria-label="Amount in MNT"
          />
          <div className="flex gap-3">
            <Button onClick={stake} loading={busy} disabled={!isConnected}>
              Stake bond
            </Button>
            <Button variant="secondary" onClick={unstake} loading={busy} disabled={!isConnected}>
              Withdraw
            </Button>
          </div>
          {!isConnected && <p className="text-xs text-muted">Connect a wallet to manage the bond.</p>}
          {formError && <p className="text-xs text-crimson">{formError}</p>}
          {error && <p className="text-xs text-crimson">{error.message.split("\n")[0]}</p>}
        </div>
      ) : (
        <p className="mt-5 text-xs text-muted">
          Set <code>NEXT_PUBLIC_AGENT_STAKING_ADDRESS</code> to enable staking.
        </p>
      )}
    </Card>
  );
}
