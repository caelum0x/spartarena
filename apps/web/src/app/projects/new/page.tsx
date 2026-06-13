import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/Container";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";

export const metadata: Metadata = {
  title: "Create Project",
  description: "Create a sponsor workstream for related Battles.",
};

export default function NewProjectPage() {
  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Projects"
        title="Create a Project"
        description="Open a sponsor workstream, define the required skills, and then attach Battles as the work progresses."
      />
      <div className="mx-auto max-w-2xl">
        <CreateProjectForm />
      </div>
    </Container>
  );
}
