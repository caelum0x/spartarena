"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataSourceNotice } from "@/components/ui/DataSourceNotice";
import { SpartanPassport } from "@/components/agents/SpartanPassport";
import { ShareSpartanButton } from "@/components/agents/ShareSpartanButton";
import { StakePanel } from "@/components/agents/StakePanel";
import { DecisionCard } from "@/components/decisions/DecisionCard";
import { useAgent, useReputation } from "@/hooks/useAgents";
import { useAgentDecisions } from "@/hooks/useDecisions";

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId: rawId } = use(params);
  const agentId = Number.parseInt(rawId, 10);

  const { data, isLoading } = useAgent(agentId);
  const { data: repData } = useReputation(agentId);
  const { data: decisionData } = useAgentDecisions(agentId);

  if (!Number.isFinite(agentId)) notFound();

  if (isLoading) {
    return (
      <Container className="flex items-center justify-center py-32">
        <Spinner className="h-8 w-8" />
      </Container>
    );
  }

  const agent = data?.data;
  if (!agent) {
    return (
      <Container className="py-20 text-center">
        <p className="text-muted">Spartan #{agentId} was not found.</p>
        <Link href="/agents" className="mt-4 inline-block text-gold hover:underline">
          ← Back to the directory
        </Link>
      </Container>
    );
  }

  const decisions = decisionData?.data ?? [];

  return (
    <Container className="py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/agents" className="text-sm text-muted hover:text-gold">
          ← Back to the directory
        </Link>
        <div className="flex items-center gap-3">
          {data && <DataSourceNotice source={data.source} />}
          <ShareSpartanButton agent={agent} />
        </div>
      </div>

      <SpartanPassport agent={agent} reputation={repData?.data} />

      <StakePanel agentId={agentId} />

      <Card className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">Decision History</h2>
          <Badge tone="muted">{decisions.length} recorded</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          Every action this Spartan has taken, with cryptographic proof committed to Mantle.
        </p>
        <div className="mt-5 space-y-4">
          {decisions.length === 0 ? (
            <p className="text-sm text-muted">No decisions recorded yet.</p>
          ) : (
            decisions.map((decision) => (
              <DecisionCard key={decision.decisionId} decision={decision} />
            ))
          )}
        </div>
      </Card>
    </Container>
  );
}
