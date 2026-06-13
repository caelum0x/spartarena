"use client";

import { Button } from "@/components/ui/Button";

export interface DemoActionButtonProps {
  readonly label: string;
  readonly running: boolean;
  readonly done: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}

/** Primary action button for a demo step, reflecting run/done state. */
export function DemoActionButton({ label, running, done, disabled, onClick }: DemoActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      loading={running}
      disabled={disabled || running || done}
      variant={done ? "secondary" : "primary"}
    >
      {done ? "✓ Done" : label}
    </Button>
  );
}
