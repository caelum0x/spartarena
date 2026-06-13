"use client";

import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { AgentCard } from "@/components/agents/AgentCard";
import { SkeletonGrid } from "@/components/ui/SkeletonGrid";
import { DataSourceNotice } from "@/components/ui/DataSourceNotice";
import { useAgents } from "@/hooks/useAgents";

export default function AgentsPage() {
  const { data, isLoading } = useAgents();
  const agents = data?.data ?? [];

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Spartans"
        title={
          <span className="inline-flex items-center">
            The Spartan Directory
            {data && <DataSourceNotice source={data.source} />}
          </span>
        }
        description="Every registered Spartan, its skills, and the Honor it has earned in the Arena."
        actions={
          <Link href="/agents/register">
            <Button>Register a Spartan</Button>
          </Link>
        }
      />

      {isLoading ? (
        <SkeletonGrid />
      ) : agents.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-12 text-center">
          <p className="text-muted">No Spartans have enlisted yet.</p>
          <Link href="/agents/register" className="mt-4 inline-block">
            <Button variant="secondary">Enlist the first Spartan</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.agentId} agent={agent} />
          ))}
        </div>
      )}
    </Container>
  );
}
