import { describe, expect, it } from "vitest";
import { loadEnv, resolveLlmProvider, type Env } from "./env.js";

const PROD_BASE = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://u:p@db:5432/app",
  INTERNAL_API_KEY: "secret-key",
  CORS_ORIGIN: "https://app.example.com",
};

describe("loadEnv production fail-closed (security)", () => {
  it("accepts a fully-configured production env", () => {
    expect(() => loadEnv(PROD_BASE)).not.toThrow();
  });

  it("rejects production without INTERNAL_API_KEY", () => {
    const { INTERNAL_API_KEY: _omit, ...noKey } = PROD_BASE;
    expect(() => loadEnv(noKey)).toThrow(/INTERNAL_API_KEY/);
  });

  it('rejects production with wildcard CORS', () => {
    expect(() => loadEnv({ ...PROD_BASE, CORS_ORIGIN: "*" })).toThrow(/CORS_ORIGIN/);
  });

  it("allows the same gaps in development", () => {
    expect(() =>
      loadEnv({ NODE_ENV: "development", DATABASE_URL: "postgresql://x", CORS_ORIGIN: "*" }),
    ).not.toThrow();
  });
});

describe("resolveLlmProvider precedence", () => {
  const base = (over: Partial<Env>): Env =>
    loadEnv({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://x",
      ...(over as Record<string, string>),
    });

  it("returns undefined when nothing is configured", () => {
    expect(resolveLlmProvider(base({}))).toBeUndefined();
  });

  it("selects anthropic, then openai, by key presence", () => {
    expect(resolveLlmProvider(base({ ANTHROPIC_API_KEY: "a" } as Partial<Env>))).toBe("anthropic");
    expect(resolveLlmProvider(base({ OPENAI_API_KEY: "o" } as Partial<Env>))).toBe("openai");
  });

  it("honors an explicit LLM_PROVIDER=mock even when a real key is present", () => {
    const e = base({ LLM_PROVIDER: "mock", ANTHROPIC_API_KEY: "a" } as Partial<Env>);
    expect(resolveLlmProvider(e)).toBe("mock");
  });
});
