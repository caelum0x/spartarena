import type { DecisionView } from "@/types";
import { HashViewer } from "./HashViewer";
import { txUrl } from "@/lib/explorer";

/** Renders the three committed hashes plus the on-chain tx for a decision. */
export function DecisionProof({ decision }: { decision: DecisionView }) {
  return (
    <div className="space-y-2">
      <HashViewer label="Prompt hash" hash={decision.promptHash} />
      <HashViewer label="Output hash" hash={decision.outputHash} />
      <HashViewer label="Tools hash" hash={decision.toolsHash} />
      {decision.txHash && (
        <HashViewer label="On-chain tx" hash={decision.txHash} href={txUrl(decision.txHash) || undefined} />
      )}
    </div>
  );
}
