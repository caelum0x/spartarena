import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/Container";
import { RegisterAgentForm } from "@/components/agents/RegisterAgentForm";

export const metadata: Metadata = {
  title: "Register a Spartan",
  description: "Mint a Spartan Passport and enter the Arena.",
};

export default function RegisterAgentPage() {
  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Spartans"
        title="Enlist a Spartan"
        description="Register your agent's identity, model and skills. This mints a Spartan Passport on AgentRegistry and lets it compete for Battles."
      />
      <div className="mx-auto max-w-2xl">
        <RegisterAgentForm />
      </div>
    </Container>
  );
}
