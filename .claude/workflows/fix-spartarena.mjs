export const meta = {
  name: 'fix-spartarena',
  description: 'Install deps, then loop: build/typecheck every package and dispatch a fixer agent per failing package until the whole monorepo is green',
  phases: [
    { title: 'Verify', detail: 'install + build/typecheck each package' },
    { title: 'Fix', detail: 'one fixer agent per failing package, then re-verify' },
  ],
}

const ROOT = '/Users/arhansubasi/spartarena'

// Packages in dependency order. Each entry: how to verify it.
const TARGETS = [
  { name: '@spartarena/shared', dir: 'packages/shared', cmd: 'pnpm --filter @spartarena/shared build' },
  { name: '@spartarena/byreal-adapter', dir: 'packages/byreal-adapter', cmd: 'pnpm --filter @spartarena/byreal-adapter build' },
  { name: '@spartarena/sdk', dir: 'packages/sdk', cmd: 'pnpm --filter @spartarena/sdk build' },
  { name: '@spartarena/agent-runner', dir: 'apps/agent-runner', cmd: 'pnpm --filter @spartarena/agent-runner typecheck' },
  { name: '@spartarena/api', dir: 'apps/api', cmd: 'pnpm --filter @spartarena/api typecheck' },
  { name: '@spartarena/web', dir: 'apps/web', cmd: 'pnpm --filter @spartarena/web typecheck' },
]

const VERDICT = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
    errorsTail: { type: 'string' },
  },
  required: ['ok', 'summary'],
  additionalProperties: true,
}

function verifyPrompt(t) {
  return `You are verifying one package in the SpartArena monorepo at ${ROOT}.
Run exactly this from ${ROOT}:
  cd ${ROOT} && ${t.cmd}
If it needs deps, run \`cd ${ROOT} && pnpm install --frozen-lockfile=false\` first (esbuild build is allowed).
Report ok=true only if the command exits 0. If it fails, put the last ~60 lines of compiler output in errorsTail. Do NOT fix anything in this step.`
}

function fixPrompt(t, errorsTail) {
  return `Fix build/type errors in the SpartArena package ${t.name} (${ROOT}/${t.dir}).
Read ${ROOT}/.claude/build-context.md for shared context (contract surface, chain config, brand).
Constraints: minimal diffs to make \`cd ${ROOT} && ${t.cmd}\` pass. Strict TypeScript, no \`any\` shortcuts that hide real bugs, no hardcoded secrets. You MAY edit files in ${t.dir} and fix obvious cross-package type/import mismatches in dependency packages if that is the true cause. After editing, re-run the command and iterate until it exits 0. Prior error output:\n\n${errorsTail ?? '(none captured)'}\n\nReport ok=true once the command passes.`
}

phase('Verify')
log('Installing workspace dependencies...')
await agent(`Run \`cd ${ROOT} && pnpm install --frozen-lockfile=false\` and report the tail of the output. The esbuild build script is allowed (configured in package.json pnpm.onlyBuiltDependencies). If install fails, report the error.`,
  { label: 'install', phase: 'Verify' })

const MAX_ROUNDS = 3
const stillBroken = []

const results = await parallel(
  TARGETS.map((t) => () =>
    agent(verifyPrompt(t), { label: `verify:${t.dir}`, phase: 'Verify', schema: VERDICT }).then((v) => ({ t, v })),
  ),
)

for (const r of results.filter(Boolean)) {
  if (!r.v?.ok) stillBroken.push({ t: r.t, errorsTail: r.v?.errorsTail })
}
log(`Verify round: ${TARGETS.length - stillBroken.length}/${TARGETS.length} green`)

phase('Fix')
let round = 0
let broken = stillBroken
while (broken.length > 0 && round < MAX_ROUNDS) {
  round++
  log(`Fix round ${round}: repairing ${broken.map((b) => b.t.name).join(', ')}`)

  // Fixers run sequentially in dependency order so a fixed dependency is in place
  // before a dependent is re-checked.
  const next = []
  for (const b of broken) {
    const fixed = await agent(fixPrompt(b.t, b.errorsTail), {
      label: `fix:${b.t.dir}`,
      phase: 'Fix',
      schema: VERDICT,
    })
    if (!fixed?.ok) next.push({ t: b.t, errorsTail: fixed?.errorsTail })
  }
  broken = next
}

return {
  rounds: round,
  greenAfter: TARGETS.filter((t) => !broken.find((b) => b.t.name === t.name)).map((t) => t.name),
  stillBroken: broken.map((b) => b.t.name),
}
