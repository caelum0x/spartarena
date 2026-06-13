"use client";

import { useCallback } from "react";
import { parseEther, type Hex } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { contractAbis, contractAddresses, hasContractAddresses } from "@/config/contracts";
import { hashString } from "@/lib/hash";

/**
 * Wallet connection helpers wrapping wagmi's connect/disconnect.
 */
export function useWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const connectWallet = useCallback(() => {
    connect({ connector: injected() });
  }, [connect]);

  return { address, isConnected, chainId, isConnecting, connectWallet, disconnect };
}

/**
 * On-chain write methods for the SpartArena contracts, built on wagmi's
 * `useWriteContract`. Writes are only possible when every contract address is
 * configured (`hasContractAddresses`); otherwise callers should keep the UI in
 * read-only/demo mode. The returned `txHash`/`receipt` let callers show progress.
 */
export function useWriteContracts() {
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const ensureReady = useCallback((): NonNullable<typeof contractAddresses> => {
    if (!contractAddresses) {
      throw new Error(
        "Contract addresses are not configured. Set NEXT_PUBLIC_*_ADDRESS env vars to enable on-chain writes.",
      );
    }
    return contractAddresses;
  }, []);

  /** Register a new Spartan (agent) on AgentRegistry. */
  const registerAgent = useCallback(
    async (params: {
      agentWallet: Hex;
      metadataURI: string;
      skillsHash: Hex;
    }): Promise<Hex> => {
      const addresses = ensureReady();
      return writeContractAsync({
        address: addresses.AgentRegistry,
        abi: contractAbis.AgentRegistry,
        functionName: "registerAgent",
        args: [params.agentWallet, params.metadataURI, params.skillsHash],
      });
    },
    [ensureReady, writeContractAsync],
  );

  /** Create a Battle (task) on TaskEscrow, locking the reward in escrow. */
  const createTask = useCallback(
    async (params: {
      description: string;
      rewardMnt: string;
      deadlineUnix: bigint;
    }): Promise<Hex> => {
      const addresses = ensureReady();
      const descriptionHash = hashString(params.description);
      return writeContractAsync({
        address: addresses.TaskEscrow,
        abi: contractAbis.TaskEscrow,
        functionName: "createTask",
        args: [descriptionHash, params.deadlineUnix],
        value: parseEther(params.rewardMnt),
      });
    },
    [ensureReady, writeContractAsync],
  );

  /** Oracle Judge verifies a submitted Battle result. */
  const verifyTask = useCallback(
    async (taskId: bigint): Promise<Hex> => {
      const addresses = ensureReady();
      return writeContractAsync({
        address: addresses.TaskEscrow,
        abi: contractAbis.TaskEscrow,
        functionName: "verifyTask",
        args: [taskId],
      });
    },
    [ensureReady, writeContractAsync],
  );

  /** Release the escrowed reward to the winning Spartan. */
  const releasePayment = useCallback(
    async (taskId: bigint): Promise<Hex> => {
      const addresses = ensureReady();
      return writeContractAsync({
        address: addresses.TaskEscrow,
        abi: contractAbis.TaskEscrow,
        functionName: "releasePayment",
        args: [taskId],
      });
    },
    [ensureReady, writeContractAsync],
  );

  return {
    canWrite: hasContractAddresses,
    registerAgent,
    createTask,
    verifyTask,
    releasePayment,
    txHash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
