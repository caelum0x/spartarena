"use client";

import { useWallet } from "@/hooks/useWriteContracts";
import { Button } from "@/components/ui/Button";
import { shortAddress } from "@/lib/format";

/** Wallet connect / disconnect control shown in the header. */
export function ConnectButton() {
  const { address, isConnected, isConnecting, connectWallet, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <Button variant="secondary" size="sm" onClick={() => disconnect()} title={address}>
        <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
        {shortAddress(address)}
      </Button>
    );
  }

  return (
    <Button size="sm" loading={isConnecting} onClick={connectWallet}>
      Connect Wallet
    </Button>
  );
}
