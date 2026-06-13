import { Container } from "@/components/ui/Container";
import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <Container className="flex min-h-[50vh] items-center justify-center py-20">
      <Spinner className="h-8 w-8" />
    </Container>
  );
}
