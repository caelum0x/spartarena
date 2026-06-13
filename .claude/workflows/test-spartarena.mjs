export const meta = {
  name: 'test-spartarena',
  description: 'Add real Vitest test suites across shared, sdk, byreal-adapter, agent-runner, api (and web unit tests), then run them all',
  phases: [
    { title: 'Author tests', detail: 'one agent per package writes + runs vitest (parallel)' },
    { title: 'Run', detail: 'execute every suite and report pass/fail counts' },
  ],
}

const ROOT = '/Users/arhansubasi/spartarena'
const CTX = `READ FIRST: ${ROOT}/.claude/build-context.md and ${ROOT}/.claude/production-context.md. This is a pnpm workspace; pnpm native builds are already approved in pnpm-workspace.yaml. Use Vitest. Add vitest (and needed helpers) to the package's devDependencies and a "test" script ("vitest run") + "test:watch". Write MEANINGFUL unit tests for real logic (not trivial getters): cover happy paths, edge cases, error handling, and boundary validation. Mock external network/IO (fetch, viem clients, Prisma) — never hit live APIs in tests. Tests must be deterministic and pass offline. Work ONLY in your assigned directory. After writing, run \`cd ${ROOT} && pnpm --filter <pkg> test\` and iterate until green. Report the number of test files + test cases and the final pass/fail.`

const VERDICT = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, testFiles: { type: 'number' }, testCases: { type: 'number' }, summary: { type: 'string' }, errorsTail: { type: 'string' } },
  required: ['ok', 'summary'],
  additionalProperties: true,
}

phase('Author tests')

const results = await parallel([
  () => agent(`${CTX}

YOUR SCOPE: \`packages/shared\`. Test the pure logic: utils/hash.ts (hashJson determinism + keccak correctness vs a known vector), utils/format.ts (formatMnt, shortAddress, timeAgo edge cases), utils/explorer.ts, skillIds.ts (keccak of codes), taskStatus.ts (label/color maps cover every enum member), reputation.ts (computeTotalScore weighting incl. zero/clamp cases), and the zod schemas in zod/* (valid parses + rejection of out-of-range/invalid). Aim for high coverage of this package's exported functions.`,
    { label: 'test:shared', phase: 'Author tests', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`packages/sdk\`. Test without real RPC: addresses.ts (env loader: valid, missing, malformed), abis.ts (shape/selectors sanity), and SpartArenaClient read/write methods by injecting a FAKE viem publicClient/walletClient (stub readContract/writeContract/simulateContract) and asserting the correct address/functionName/args are passed (e.g. createTask passes value, registerAgent passes the right tuple, recordDecision encodes scores). Test any hash/encoding helpers. Don't hit a network.`,
    { label: 'test:sdk', phase: 'Author tests', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`packages/byreal-adapter\`. Stub global fetch to return recorded Byreal-shaped JSON and test ByrealRestClient (pools list, mint list, swap quote): correct URL/method/body, zod validation of responses, string-money parsing, timeout/error handling (non-200, malformed JSON). Test the MockByrealAdapter (BYREAL_MOCK path) and that each result carries a real toolProofHash (keccak) + recordedOnMantle flag. Test createByrealAdapter selection (real default vs BYREAL_MOCK=true).`,
    { label: 'test:byreal', phase: 'Author tests', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/agent-runner\`. This is the most important suite. Test: hash.ts (hashDecision determinism), verifier.ts (scoreOutput formulas incl. clamping + speed decay), tools/mantle.ts anomaly math (median/outlier/maxOverMedian via the offline path or injected transfers — use MANTLE_OFFLINE), tools/assets.ts offline path, llm/provider.ts getProvider() precedence (LLM_PROVIDER=mock wins over a present key; anthropic/openai explicit; auto-select; throw when unconfigured), and BOTH agents end-to-end with the MockLlmProvider + offline tools (AlphaSentinelAgent + YieldStrategistAgent produce schema-valid output, evidence linkage, deterministic scores). Stub fetch for the real anthropic/openai providers to assert request shape + JSON parse/retry. Keep existing src working.`,
    { label: 'test:agent-runner', phase: 'Author tests', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/api\`. Use Vitest. Test pure/unit logic without a real DB or chain: lib/hash.ts, lib/pagination.ts, lib/errors.ts, the { success,data,error,meta } envelope helper, and each module's zod schema (valid + invalid). For services that touch Prisma/chain, inject FAKE repositories/clients (dependency-inject or vi.mock) and assert business logic (e.g. execution service hashes + would-write, reputation scorer math, indexer cursor advancement with stubbed getLogs). Add at least one Fastify route test using app.inject() against an in-memory server with mocked services (e.g. GET /health, GET /agents). Do NOT require a running Postgres.`,
    { label: 'test:api', phase: 'Author tests', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/web\` UNIT tests only (no Playwright/browser). Use Vitest + @testing-library/react + jsdom (add as devDeps, set test environment jsdom). Test pure lib: lib/format.ts, lib/hash.ts, lib/explorer.ts, lib/api.ts (mock fetch — envelope success/error, USE_MOCKS fallback gating), and 2-3 presentational components that render from props (e.g. BattleStatusBadge maps status→label/color, SkillBadge, HashViewer truncation, a Stat). Keep it deterministic; mock wagmi/next where imported. Do not start a dev server.`,
    { label: 'test:web', phase: 'Author tests', schema: VERDICT }),
])

const ok = results.filter(Boolean)
for (const r of ok) log(`${r.ok ? '✓' : '✗'} ${r.testFiles ?? '?'} files / ${r.testCases ?? '?'} cases — ${r.summary?.slice(0, 100) ?? ''}`)

phase('Run')
const pkgs = [
  ['shared', '@spartarena/shared'],
  ['sdk', '@spartarena/sdk'],
  ['byreal', '@spartarena/byreal-adapter'],
  ['agent-runner', '@spartarena/agent-runner'],
  ['api', '@spartarena/api'],
  ['web', '@spartarena/web'],
]
const runs = await parallel(pkgs.map(([name, pkg]) => () =>
  agent(`Run \`cd ${ROOT} && pnpm --filter ${pkg} test\`. Report ok=true only if the suite exits 0; include the pass/fail/total counts in summary and the last ~40 lines in errorsTail if it fails. Do not modify code.`,
    { label: `run:${name}`, phase: 'Run', schema: VERDICT }).then((v) => ({ name, ...v }))))

return {
  authored: ok.map((r) => ({ ok: r.ok, files: r.testFiles, cases: r.testCases })),
  run: runs.filter(Boolean).map((r) => ({ name: r.name, ok: r.ok, summary: r.summary })),
}
