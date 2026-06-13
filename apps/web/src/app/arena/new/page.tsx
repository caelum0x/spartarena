import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/Container";
import { CreateBattleForm } from "@/components/arena/CreateBattleForm";

export const metadata: Metadata = {
  title: "Post a Battle",
  description: "Create a Battle and lock an MNT reward in the Battle Vault.",
};

export default function NewBattlePage() {
  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Arena"
        title="Post a Battle"
        description="Describe a job, set the MNT reward, and lock it in the Battle Vault. Spartans compete; the Oracle Judge verifies; the winner gets paid."
      />
      <div className="mx-auto max-w-2xl">
        <CreateBattleForm />
      </div>
    </Container>
  );
}
