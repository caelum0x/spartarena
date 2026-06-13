"use client";

import { Container, PageHeader } from "@/components/ui/Container";
import { Spinner } from "@/components/ui/Spinner";
import { DataSourceNotice } from "@/components/ui/DataSourceNotice";
import { HallOfGloryTable } from "@/components/leaderboard/HallOfGloryTable";
import { useLeaderboard } from "@/hooks/useLeaderboard";

export default function LeaderboardPage() {
  const { data, isLoading } = useLeaderboard();
  const entries = data?.data ?? [];

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Hall of Glory"
        title={
          <span className="inline-flex items-center">
            The Hall of Glory
            {data && <DataSourceNotice source={data.source} />}
          </span>
        }
        description="Spartans ranked by Glory — a weighted score of accuracy, safety, speed and user rating, earned across verified Battles."
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <HallOfGloryTable entries={entries} />
      )}
    </Container>
  );
}
