"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { ByrealTabs } from "@/components/byreal/ByrealTabs";
import {
  useByrealPositions,
  type ByrealPositionView,
} from "@/hooks/useByrealPositions";
import { formatUsd, shortAddress } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Solana base58 public key: 32-44 chars, base58 alphabet (no 0OIl). */
const OWNER_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default function ByrealPositionsPage() {
  const [draft, setDraft] = useState("");
  const [owner, setOwner] = useState("");

  const trimmed = draft.trim();
  const draftValid = OWNER_REGEX.test(trimmed);

  const {
    data: positions,
    isFetching,
    isError,
    error,
  } = useByrealPositions(owner);

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!draftValid) return;
    setOwner(trimmed);
  };

  const hasLookedUp = owner !== "";

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="LP Positions"
        description="A read-only view of a wallet's REAL Byreal (Solana) liquidity positions. Paste any Solana wallet to inspect its open positions, value and unclaimed fees. Opening, adjusting or closing positions is Solana-side and out of scope here."
      />

      <ByrealTabs />

      <form onSubmit={onSubmit} className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <Input
            name="owner"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Solana wallet address (e.g. 7xKX…gAsU)"
            aria-label="Solana wallet address"
            spellCheck={false}
            autoComplete="off"
            error={
              trimmed.length > 0 && !draftValid
                ? "That does not look like a Solana wallet address."
                : undefined
            }
            hint={
              trimmed.length === 0
                ? "Base58, 32-44 characters."
                : undefined
            }
          />
        </div>
        <Button type="submit" disabled={!draftValid} loading={isFetching} className="sm:mt-0">
          Look up
        </Button>
      </form>

      {!hasLookedUp ? (
        <Card className="flex flex-col items-center gap-2 text-center text-muted">
          <p className="text-foreground/90">Paste a Solana wallet address above to begin.</p>
          <p className="text-sm">
            We read the wallet&apos;s real Byreal LP positions directly from the
            Byreal API — nothing is signed or modified.
          </p>
        </Card>
      ) : isError ? (
        <Card className="border-crimson/30 bg-crimson/5 text-center text-crimson-soft">
          Could not load positions for this wallet.
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
        </Card>
      ) : isFetching || !positions ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : positions.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 text-center text-muted">
          <p className="text-foreground/90">No Byreal positions for this wallet.</p>
          <p className="text-sm">
            Double-check the address, or try a wallet that holds Byreal
            liquidity.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {positions.map((position) => (
            <PositionCard key={position.positionId} position={position} />
          ))}
        </div>
      )}
    </Container>
  );
}

function PositionCard({ position }: { position: ByrealPositionView }) {
  const { poolAddress, valueUsd, feesUsd, liquidity } = position;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted">Pool</p>
          {poolAddress ? (
            <Link
              href={`/byreal/pools/${poolAddress}`}
              className={cn(
                "font-display text-lg font-semibold text-foreground transition-colors",
                "hover:text-gold",
              )}
            >
              {shortAddress(poolAddress)}
            </Link>
          ) : (
            <p className="font-display text-lg font-semibold text-muted">
              Unknown pool
            </p>
          )}
        </div>
        <Badge tone="gold">LP Position</Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="Value"
          value={valueUsd === null ? "—" : formatUsd(valueUsd)}
        />
        <Stat
          label="Unclaimed fees"
          value={feesUsd === null ? "—" : formatUsd(feesUsd)}
        />
        <Stat label="Liquidity" value={liquidity} />
      </div>
    </Card>
  );
}
