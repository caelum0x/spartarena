"use client";

import { useState } from "react";
import { shortHash } from "@/lib/hash";
import { cn } from "@/lib/cn";

export interface HashViewerProps {
  readonly label: string;
  readonly hash: string;
  readonly href?: string;
}

/** Displays a labelled hash with copy-to-clipboard and optional explorer link. */
export function HashViewer({ label, hash, href }: HashViewerProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — silently ignore.
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <code className="font-mono text-xs text-foreground/90">{shortHash(hash)}</code>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] uppercase transition-colors",
            copied ? "text-success" : "text-muted hover:text-gold",
          )}
          aria-label={`Copy ${label}`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-gold hover:underline"
            aria-label={`View ${label} on explorer`}
          >
            ↗
          </a>
        )}
      </div>
    </div>
  );
}
