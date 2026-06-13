import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-7xl font-bold text-gradient-gold">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
        This path leads nowhere
      </h1>
      <p className="mt-2 max-w-md text-muted">
        The page you seek has fallen in battle. Return to the Arena and rejoin the fight.
      </p>
      <Link href="/" className="mt-8">
        <Button>Return home</Button>
      </Link>
    </Container>
  );
}
