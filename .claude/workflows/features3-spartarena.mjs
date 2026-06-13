export const meta = {
  name: 'features3-spartarena',
  description: 'ContractAuditAgent (4th agent), real Telegram/Discord alert wiring in the API execution/slash flows, and per-Spartan OG share cards + share UI',
  phases: [
    { title: 'Features', detail: 'agent-runner, api, web (parallel)' },
    { title: 'Verify', detail: 'typecheck/build each touched package' },
  ],
}

const ROOT = '/Users/arhansubasi/spartarena'

const FOUNDATION = `Already built (consume, don't rebuild): 6 contracts incl. AgentStaking; 3 agents (AlphaSentinel, YieldStrategist, ByrealPoolAnalyst) in apps/agent-runner conforming to BaseAgent with the completeJsonOrFallback LLM pattern (real Anthropic/OpenAI, mock behind LLM_PROVIDER=mock); src/verifier.ts scoreOutput is an exhaustive switch over AgentOutput.decisionType (add new cases there). Mantle reads via MantleReader (viem) + Etherscan-V2. API has modules: agents, tasks, decisions, reputation, execution, indexer, notifications (telegram.service + discord.service exist), staking, byreal, chronicle. SkillRegistry already seeds CONTRACT_AUDIT + GAS_OPTIMIZATION + TELEGRAM_ALERT. Web is Next.js App Router (15 routes) with /api/og already present.`

const CTX = `READ FIRST: ${ROOT}/.claude/build-context.md, ${ROOT}/.claude/production-context.md. Production project: real code/connections, strict TS, zod validation, error handling, no \`any\`, no hardcoded secrets, no-op gracefully when optional env (telegram/discord keys) is unset. Work ONLY in your assigned directory (read others freely). Update .env.example for new vars. Make your package typecheck/build. Return a concise summary.\n\n${FOUNDATION}`

const VERDICT = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, summary: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, errorsTail: { type: 'string' } },
  required: ['ok', 'summary'],
  additionalProperties: true,
}

phase('Features')

const results = await parallel([
  () => agent(`${CTX}

YOUR SCOPE: \`apps/agent-runner\` — add a FOURTH real agent: ContractAuditAgent (skill CONTRACT_AUDIT).
- In src/schemas.ts add ContractAuditOutput { agentName:"ContractAuditor"; taskId; decisionType:"CONTRACT_AUDIT"; target: string (0x address); summary; findings: { severity:"info"|"low"|"medium"|"high"|"critical"; title; detail; }[]; confidence(0-100); riskScore(0-100); humanExplanation } + a ContractAuditLlmDecisionSchema (LLM authors summary + findings reasoning + humanExplanation; agent attaches deterministic on-chain facts). Add to AgentOutput union.
- Add a real tool src/tools/contract.ts: ContractInspector using viem — getCode(address) (is it a deployed contract? bytecode size), getBalance, and a few static heuristics over the bytecode (e.g. presence of SELFDESTRUCT 0xff / DELEGATECALL 0xf4 / detect no code = EOA). Record ToolCalls. Offline path when MANTLE_OFFLINE=true.
- Add src/agents/ContractAuditAgent.ts (BaseAgent): inspects the target contract, derives riskScore/confidence deterministically from heuristics, uses completeJsonOrFallback for the LLM-authored findings narrative. Add src/prompts/contract-auditor.system.ts.
- Add the BYREAL/new case: update src/verifier.ts evidenceCountFor to handle CONTRACT_AUDIT (findings.length).
- Wire a 4th section into src/demo.ts (keep the three existing agents intact) runnable offline (LLM_PROVIDER=mock MANTLE_OFFLINE=true).
- Verify: cd ${ROOT} && pnpm --filter @spartarena/agent-runner typecheck; offline demo runs all FOUR agents. Report ok.`,
    { label: 'feat3:agent', phase: 'Features', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/api\` — wire REAL notifications into the lifecycle and expose status.
- Confirm/implement src/modules/notifications/telegram.service.ts (POST https://api.telegram.org/bot<token>/sendMessage, {chat_id,text,parse_mode:"Markdown"}) and discord.service.ts (POST DISCORD_WEBHOOK_URL {content}); both must no-op (debug log) when their env is unset, with timeout + error handling (never throw into the caller).
- Add a NotificationService that formats + fans out to both channels, and CALL it from the real lifecycle: when a decision is recorded/result submitted in the execution service (a Spartan completed a Battle), when a task is verified, and (best-effort) when a slash is indexed. Messages use the brand voice + include the explorer link.
- Add GET /notifications/status returning which channels are configured ({ telegram:boolean, discord:boolean }) — never leak the token/secret.
- Keep the { success,data,error,meta } envelope, zod-validate. Update .env.example (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, DISCORD_WEBHOOK_URL already exist — document them).
- Verify: cd ${ROOT} && pnpm --filter @spartarena/api typecheck. Report ok.`,
    { label: 'feat3:api', phase: 'Features', schema: VERDICT }),

  () => agent(`${CTX}

YOUR SCOPE: \`apps/web\` — shareable Spartan cards + audit surfacing.
- Make src/app/api/og a DYNAMIC OG image route: accept ?agentId= (and optionally ?name=&honor=&earned=) and render a branded Spartan share card (next/og ImageResponse, Spartan dark+bronze theme, agent name, Honor/Glory, completed battles). Keep a default card when no params.
- On the agent profile (src/app/agents/[agentId]) add a "Share" button that copies/open the share URL (links to the agent page with OG meta) — add per-agent generateMetadata or a client share action using the dynamic OG URL.
- Add a small NotificationStatus indicator (reads backend GET /notifications/status) shown in the footer or agent page — "Alerts: Telegram ✓ / Discord ✓" when configured.
- If a decision in the War Chronicle is a CONTRACT_AUDIT, render its findings (severity badges) in the DecisionCard/DecisionProof (read decisionType/actionType). Keep graceful when fields absent.
- Verify: cd ${ROOT} && pnpm --filter @spartarena/web typecheck AND pnpm --filter @spartarena/web build must pass. Report ok.`,
    { label: 'feat3:web', phase: 'Features', schema: VERDICT }),
])

const ok = results.filter(Boolean)
for (const r of ok) log(`${r.ok ? '✓' : '✗'} ${r.summary?.slice(0, 130) ?? ''}`)

phase('Verify')
const checks = [
  { name: 'agent-runner', cmd: 'pnpm --filter @spartarena/agent-runner typecheck' },
  { name: 'api', cmd: 'pnpm --filter @spartarena/api typecheck' },
  { name: 'web', cmd: 'pnpm --filter @spartarena/web build' },
]
const verify = await parallel(checks.map((c) => () =>
  agent(`Run \`cd ${ROOT} && pnpm install --frozen-lockfile=false && ${c.cmd}\`. Report ok=true only if the final command exits 0, else last ~60 lines in errorsTail. Don't fix anything.`,
    { label: `verify:${c.name}`, phase: 'Verify', schema: VERDICT }).then((v) => ({ name: c.name, ...v }))))

return { features: ok.map((r) => ({ ok: r.ok })), verify: verify.filter(Boolean).map((v) => ({ name: v.name, ok: v.ok })) }
