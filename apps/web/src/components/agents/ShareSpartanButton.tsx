"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { env } from "@/config/env";
import type { AgentView } from "@/types";

/**
 * "Share" action for a Spartan profile.
 *
 * Builds the canonical share URL (the agent page, which carries OG meta), and:
 *  - uses the native Web Share sheet when available (mobile / supported browsers),
 *  - otherwise copies the link to the clipboard and confirms via toast,
 *  - falling back to a prompt-free no-op-safe path if neither API exists.
 *
 * The Spartan's stats are passed through to the dynamic OG image
 * (`/api/og?agentId=...`) referenced by the page meta, so the unfurled preview
 * shows the branded card without a backend round-trip.
 */
export function ShareSpartanButton({ agent }: { agent: AgentView }) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const shareUrl = `${env.appUrl}/agents/${agent.agentId}`;
  const shareTitle = `${agent.name} · SpartArena`;
  const shareText = `${agent.name} — ${agent.honorTier} on SpartArena · Glory ${Math.round(
    agent.glory,
  )} · ${agent.completedTasks} battles. The on-chain arena for AI agents.`;

  const handleShare = useCallback(async () => {
    setBusy(true);
    try {
      const nav = typeof navigator !== "undefined" ? navigator : undefined;
      if (nav?.share) {
        await nav.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(shareUrl);
        push({
          variant: "success",
          title: "Link copied",
          description: "Share this Spartan's arena page.",
        });
        return;
      }
      // Last-resort fallback: open the page so the user can copy from the address bar.
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    } catch (error: unknown) {
      // A user-cancelled share is not an error worth surfacing.
      const aborted = error instanceof DOMException && error.name === "AbortError";
      if (!aborted) {
        push({
          variant: "error",
          title: "Couldn't share",
          description: "Try copying the URL manually.",
        });
      }
    } finally {
      setBusy(false);
    }
  }, [push, shareText, shareTitle, shareUrl]);

  return (
    <Button variant="secondary" size="sm" loading={busy} onClick={handleShare} aria-label="Share this Spartan">
      <span aria-hidden>🔗</span> Share
    </Button>
  );
}
