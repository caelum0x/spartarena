import { SKILLS_BY_CODE, isSkillCode } from "@spartarena/shared";
import { Badge } from "@/components/ui/Badge";

/** Renders a skill code as a labelled badge, with a tooltip description. */
export function SkillBadge({ code }: { code: string }) {
  const skill = isSkillCode(code) ? SKILLS_BY_CODE[code] : undefined;
  const label = code
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return (
    <Badge tone="gold" className="cursor-default" >
      <span title={skill?.description ?? code}>{label}</span>
    </Badge>
  );
}
