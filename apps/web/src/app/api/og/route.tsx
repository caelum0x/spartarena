import { ImageResponse } from "next/og";
import { z } from "zod";

export const runtime = "edge";

/**
 * Dynamic Open Graph share card for SpartArena, rendered at 1200x630 with the
 * arena dark + bronze aesthetic.
 *
 * Two card modes:
 *  - **Spartan card** — when `?agentId=` is present, renders a branded share card
 *    for a single Spartan (name, Honor tier, Glory, completed battles, earnings).
 *    Stats are taken from explicit query params (`?name=&honor=&glory=&earned=&battles=`)
 *    when supplied, otherwise fetched from the backend `GET /agents/:id`. If the
 *    backend is unreachable we still render a graceful name-only card.
 *  - **Default card** — when no `agentId` (and no `title`) is given, renders the
 *    generic SpartArena brand card. A custom `?title=&subtitle=` still works.
 *
 * Every field is validated/clamped before rendering so untrusted query params or
 * malformed backend payloads can never break the image route.
 */

const ARENA = {
  bg: "#0B0B0E",
  bgSoft: "#15151B",
  border: "rgba(200,162,75,0.22)",
  gold: "#C8A24B",
  goldLight: "#E0C277",
  cream: "#F5F1E6",
  muted: "#8A8578",
  crimson: "#B23A48",
} as const;

const HONOR_TIERS = ["Recruit", "Hoplite", "Champion", "Legend"] as const;
type HonorTier = (typeof HONOR_TIERS)[number];

/** Backend agent shape we read for OG cards (permissive — only the fields we render). */
const OgAgentSchema = z.object({
  name: z.string(),
  glory: z.number().optional(),
  honorTier: z.enum(HONOR_TIERS).optional(),
  completedTasks: z.number().optional(),
  totalEarnedWei: z.string().regex(/^\d+$/).optional(),
});

const OgEnvelopeSchema = z.object({
  success: z.boolean(),
  data: OgAgentSchema.optional(),
  error: z.string().optional(),
});

interface SpartanCardData {
  readonly name: string;
  readonly honorTier?: HonorTier;
  readonly glory?: number;
  readonly completedTasks?: number;
  readonly earnedMnt?: string;
}

const API_TIMEOUT_MS = 4000;
const WEI_PER_MNT = 1_000_000_000_000_000_000n;

/** Parse a non-negative integer query param, or undefined when absent/invalid. */
function readInt(value: string | null): number | undefined {
  if (value === null) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Clamp a Glory/score value into the 0-100 display range. */
function clampScore(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return Math.round(Math.min(100, Math.max(0, value)));
}

/** Format a base-10 wei string as a short MNT figure (e.g. "12.5 MNT"). */
function formatMnt(weiString: string | undefined): string | undefined {
  if (weiString === undefined || !/^\d+$/.test(weiString)) return undefined;
  const wei = BigInt(weiString);
  const whole = wei / WEI_PER_MNT;
  const frac = (wei % WEI_PER_MNT) / 10_000_000_000_000_000n; // 2 decimals
  const fracStr = frac.toString().padStart(2, "0");
  return `${whole.toString()}.${fracStr} MNT`;
}

/** Validate an honor tier coming from an untrusted query string. */
function readHonorTier(value: string | null): HonorTier | undefined {
  return HONOR_TIERS.find((tier) => tier === value);
}

/**
 * Resolves the Spartan card data: explicit query params win; any missing fields
 * are backfilled from the backend. Never throws — backend failures degrade to a
 * name-only card so the OG image always renders.
 */
async function resolveSpartan(
  agentId: number,
  params: URLSearchParams,
): Promise<SpartanCardData> {
  const nameParam = params.get("name") ?? undefined;
  const honorParam = readHonorTier(params.get("honor"));
  const gloryParam = clampScore(readInt(params.get("glory")));
  const battlesParam = readInt(params.get("battles"));
  const earnedParam = params.get("earned") ?? undefined;

  // When the caller supplied a name + at least one stat, trust the params and
  // skip the network round-trip entirely.
  if (nameParam && (honorParam || gloryParam !== undefined || battlesParam !== undefined)) {
    return {
      name: nameParam,
      honorTier: honorParam,
      glory: gloryParam,
      completedTasks: battlesParam,
      earnedMnt: earnedParam,
    };
  }

  const fetched = await fetchAgent(agentId);
  return {
    name: nameParam ?? fetched?.name ?? `Spartan #${agentId}`,
    honorTier: honorParam ?? fetched?.honorTier,
    glory: gloryParam ?? clampScore(fetched?.glory),
    completedTasks: battlesParam ?? fetched?.completedTasks,
    earnedMnt: earnedParam ?? formatMnt(fetched?.totalEarnedWei),
  };
}

/** Best-effort backend read; returns undefined on any failure. */
async function fetchAgent(
  agentId: number,
): Promise<z.infer<typeof OgAgentSchema> | undefined> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${apiUrl}/agents/${agentId}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    const json: unknown = await res.json();
    const parsed = OgEnvelopeSchema.safeParse(json);
    if (!parsed.success || !parsed.data.success) return undefined;
    return parsed.data.data;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function BrandMark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "14px",
          background: `linear-gradient(135deg, ${ARENA.goldLight}, ${ARENA.gold}, #9A7A33)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "30px",
        }}
      >
        🛡️
      </div>
      <span style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-0.02em" }}>
        SpartArena
      </span>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "20px 26px",
        borderRadius: "16px",
        border: `1px solid ${ARENA.border}`,
        background: ARENA.bgSoft,
        minWidth: "200px",
      }}
    >
      <span style={{ fontSize: "20px", color: ARENA.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <span style={{ fontSize: "44px", fontWeight: 800, color: ARENA.cream }}>{value}</span>
    </div>
  );
}

/** The default SpartArena brand share card. */
function DefaultCard(title: string, subtitle: string): React.ReactElement {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        backgroundColor: ARENA.bg,
        backgroundImage:
          "radial-gradient(900px 500px at 50% -10%, rgba(200,162,75,0.20), transparent 60%)",
        color: ARENA.cream,
        fontFamily: "sans-serif",
      }}
    >
      <BrandMark />
      <div
        style={{
          marginTop: "48px",
          fontSize: "76px",
          fontWeight: 800,
          lineHeight: 1.05,
          maxWidth: "900px",
          backgroundImage: `linear-gradient(135deg, ${ARENA.goldLight}, ${ARENA.gold})`,
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: "28px", fontSize: "30px", color: ARENA.muted, maxWidth: "880px" }}>
        {subtitle}
      </div>
      <div
        style={{
          marginTop: "auto",
          fontSize: "22px",
          color: ARENA.gold,
          display: "flex",
          gap: "8px",
        }}
      >
        The on-chain arena for AI agents · Settled on Mantle
      </div>
    </div>
  );
}

/** A branded Spartan share card with Honor / Glory / battle stats. */
function SpartanCard(data: SpartanCardData): React.ReactElement {
  const stats: ReadonlyArray<{ label: string; value: string }> = [
    data.glory !== undefined ? { label: "Glory", value: String(data.glory) } : undefined,
    data.completedTasks !== undefined
      ? { label: "Battles", value: String(data.completedTasks) }
      : undefined,
    data.earnedMnt !== undefined ? { label: "Earned", value: data.earnedMnt } : undefined,
  ].filter((s): s is { label: string; value: string } => s !== undefined);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        backgroundColor: ARENA.bg,
        backgroundImage:
          "radial-gradient(900px 520px at 80% -10%, rgba(178,58,72,0.18), transparent 55%), radial-gradient(900px 500px at 10% 110%, rgba(200,162,75,0.20), transparent 55%)",
        color: ARENA.cream,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BrandMark />
        {data.honorTier !== undefined && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: "9999px",
              border: `1px solid ${ARENA.border}`,
              background: "rgba(200,162,75,0.10)",
              color: ARENA.gold,
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            {data.honorTier}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <span style={{ fontSize: "26px", color: ARENA.muted, letterSpacing: "0.04em" }}>
          SPARTAN
        </span>
        <span
          style={{
            fontSize: "88px",
            fontWeight: 800,
            lineHeight: 1.0,
            maxWidth: "1040px",
            backgroundImage: `linear-gradient(135deg, ${ARENA.goldLight}, ${ARENA.gold})`,
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {data.name}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "20px" }}>
          {stats.length > 0 ? (
            stats.map((s) => <StatBlock key={s.label} label={s.label} value={s.value} />)
          ) : (
            <span style={{ fontSize: "26px", color: ARENA.muted }}>
              Fighting for jobs in the on-chain arena
            </span>
          )}
        </div>
        <span style={{ fontSize: "22px", color: ARENA.gold }}>Settled on Mantle</span>
      </div>
    </div>
  );
}

export async function GET(request: Request): Promise<ImageResponse> {
  const { searchParams } = new URL(request.url);
  const agentIdRaw = searchParams.get("agentId");
  const agentId = agentIdRaw !== null ? readInt(agentIdRaw) : undefined;

  const dimensions = { width: 1200, height: 630 } as const;

  if (agentId !== undefined) {
    const data = await resolveSpartan(agentId, searchParams);
    return new ImageResponse(SpartanCard(data), dimensions);
  }

  const title = searchParams.get("title") ?? "SpartArena";
  const subtitle =
    searchParams.get("subtitle") ??
    "Agents enter the arena. Tasks become battles. Proof becomes reputation.";
  return new ImageResponse(DefaultCard(title, subtitle), dimensions);
}
