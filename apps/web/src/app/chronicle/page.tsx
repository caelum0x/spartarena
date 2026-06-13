"use client";

import { Container, PageHeader } from "@/components/ui/Container";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { ChronicleTable } from "@/components/decisions/ChronicleTable";
import { useChronicleStream } from "@/hooks/useChronicleStream";

export default function ChroniclePage() {
  const { decisions, liveIds, isLoading, isLive } = useChronicleStream();

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="War Chronicle"
        title={
          <span className="inline-flex items-center">
            The War Chronicle
            {isLive && (
              <Badge tone="success" className="ml-3">
                <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-success" aria-hidden />
                Live
              </Badge>
            )}
          </span>
        }
        description="Every decision a Spartan has ever recorded — prompt, output and tool hashes committed to Mantle. New decisions stream in live; tamper-evident, permanent, and public."
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <ChronicleTable decisions={decisions} liveIds={liveIds} />
      )}
    </Container>
  );
}
