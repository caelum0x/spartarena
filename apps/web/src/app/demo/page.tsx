import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/Container";
import { JudgeModeBanner } from "@/components/demo/JudgeModeBanner";
import { DemoStepper } from "@/components/demo/DemoStepper";

export const metadata: Metadata = {
  title: "Guided Demo",
  description: "A 7-step, idiot-proof walkthrough of the full SpartArena loop.",
};

export default function DemoPage() {
  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Demo"
        title="Guided Walkthrough"
        description="Follow the complete SpartArena loop end-to-end. Each step explains exactly what happens on Mantle — no prior context required."
      />
      <div className="space-y-8">
        <JudgeModeBanner />
        <DemoStepper />
      </div>
    </Container>
  );
}
