import { z } from "zod";

/**
 * Zod-validated process environment.
 *
 * The server boots from a single validated, immutable {@link Env} object so that
 * every module reads typed, guaranteed-present configuration instead of touching
 * `process.env` directly. Only `DATABASE_URL` is mandatory; chain writes and
 * notifications are feature-gated on the optional values being present.
 */

const optionalString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

const hexPrivateKey = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]{64}$/, "Private key must be 0x-prefixed 32-byte hex")
  .optional()
  .or(z.literal("").transform(() => undefined));

const ethAddress = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a 0x-prefixed 20-byte address")
  .optional()
  .or(z.literal("").transform(() => undefined));

const EnvSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  /**
   * Allowed CORS origins (comma-separated), or "*" for any. Defaults to the
   * local web dev origins — production MUST set this to its real web origin
   * rather than leaving it open.
   */
  CORS_ORIGIN: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),
  /**
   * When set, every state-mutating request (POST/PUT/PATCH/DELETE) must present a
   * matching `x-api-key` header. Leave unset only for local development.
   */
  INTERNAL_API_KEY: optionalString,
  /** Global per-IP rate limit: max requests per window. */
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  /** Global rate-limit window in milliseconds. */
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  // Database
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required to start the API"),
  REDIS_URL: optionalString,

  // Chain
  CHAIN_ID: z.coerce.number().int().positive().default(5003),
  RPC_URL: z.string().url().default("https://rpc.sepolia.mantle.xyz"),

  // Contract addresses (optional — chain reads degrade gracefully if absent).
  NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS: ethAddress,
  NEXT_PUBLIC_TASK_ESCROW_ADDRESS: ethAddress,
  NEXT_PUBLIC_DECISION_LEDGER_ADDRESS: ethAddress,
  NEXT_PUBLIC_REPUTATION_ENGINE_ADDRESS: ethAddress,
  NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS: ethAddress,
  NEXT_PUBLIC_AGENT_STAKING_ADDRESS: ethAddress,

  // Signers
  BACKEND_SIGNER_PRIVATE_KEY: hexPrivateKey,
  VERIFIER_PRIVATE_KEY: hexPrivateKey,

  // Indexer
  INDEXER_POLL_INTERVAL_MS: z.coerce.number().int().nonnegative().default(15_000),
  INDEXER_BLOCK_BATCH_SIZE: z.coerce.number().int().positive().default(2_000),

  // LLM providers (real). Selection in getProvider(): Anthropic → OpenAI → mock(flag).
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().trim().min(1).default("claude-opus-4-8"),
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-4o"),
  /** Set to "mock" to allow the deterministic offline provider (tests/demo only). */
  LLM_PROVIDER: optionalString,
  /** Per-request LLM timeout (ms). */
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  // Market / chain data providers (real)
  /** Etherscan V2 multichain key (one key, all chains). Free tier 5 req/s. */
  ETHERSCAN_API_KEY: optionalString,
  /** Optional CoinGecko demo key (sent as x-cg-demo-api-key). */
  COINGECKO_API_KEY: optionalString,
  /** Per-request market-data timeout (ms). */
  MARKET_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),

  // Byreal (Solana DEX — read/quote only). Base URL has a sane default; the
  // adapter reads BYREAL_API_URL / BYREAL_MOCK directly from the environment.
  BYREAL_API_URL: z.string().url().default("https://api2.byreal.io"),
  /** Set "true" to use the deterministic offline Byreal mock (tests/demo only). */
  BYREAL_MOCK: optionalString,

  // Notifications
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_CHAT_ID: optionalString,
  DISCORD_WEBHOOK_URL: optionalString,
}).superRefine((val, ctx) => {
  // Fail closed in production: the privileged signer endpoints must be gated and
  // CORS must not be wide open. These are startup errors, not runtime warnings,
  // so a misconfigured production deploy never binds the port.
  if (val.NODE_ENV !== "production") return;
  if (val.INTERNAL_API_KEY === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["INTERNAL_API_KEY"],
      message:
        "INTERNAL_API_KEY is required in production to authenticate state-mutating requests.",
    });
  }
  if (val.CORS_ORIGIN.trim() === "*") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CORS_ORIGIN"],
      message:
        'CORS_ORIGIN must not be "*" in production; set it to your web origin(s).',
    });
  }
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Parse and validate `process.env`. Throws a readable aggregated error listing
 * every invalid/missing variable so misconfiguration fails fast at startup.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return Object.freeze(result.data);
}

/** The validated, immutable environment for this process. */
export const env: Env = loadEnv();

/** True when every contract address required for chain reads is present. */
export function hasContractAddresses(e: Env = env): boolean {
  return (
    e.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS !== undefined &&
    e.NEXT_PUBLIC_TASK_ESCROW_ADDRESS !== undefined &&
    e.NEXT_PUBLIC_DECISION_LEDGER_ADDRESS !== undefined &&
    e.NEXT_PUBLIC_REPUTATION_ENGINE_ADDRESS !== undefined &&
    e.NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS !== undefined &&
    e.NEXT_PUBLIC_AGENT_STAKING_ADDRESS !== undefined
  );
}

/** True when on-chain writes (decision/result) are possible. */
export function canWriteChain(e: Env = env): boolean {
  return e.BACKEND_SIGNER_PRIVATE_KEY !== undefined && hasContractAddresses(e);
}

/** True when reputation scoring writes are possible. */
export function canSubmitScores(e: Env = env): boolean {
  return e.VERIFIER_PRIVATE_KEY !== undefined && hasContractAddresses(e);
}

/** The resolved LLM provider for this process, or `undefined` if unconfigured. */
export type LlmSelection = "anthropic" | "openai" | "mock";

/**
 * Resolve which LLM provider the default code path uses. Real providers take
 * precedence; the deterministic mock is only selected when explicitly opted in
 * via `LLM_PROVIDER=mock` and no real key is present. Returns `undefined` when
 * nothing is configured (callers degrade to a heuristic-only decision).
 */
export function resolveLlmProvider(e: Env = env): LlmSelection | undefined {
  // An explicit `LLM_PROVIDER=mock` opt-in always wins, even when a real key is
  // also present (the common CI / offline-demo pattern), so deterministic runs
  // are never silently upgraded to a billable provider.
  if (e.LLM_PROVIDER?.toLowerCase() === "mock") return "mock";
  if (e.ANTHROPIC_API_KEY !== undefined) return "anthropic";
  if (e.OPENAI_API_KEY !== undefined) return "openai";
  return undefined;
}
