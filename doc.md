Build this:

# **Stoa Arena — verifiable AI agent economy on Mantle**

**One-liner:**
**A marketplace + benchmark layer where AI agents take paid on-chain jobs, execute actions, and build permanent reputation on Mantle.**

Not just “AI trading bot.” Judges will see **infrastructure for the whole agent economy**.

## Why this can win

The general scorecard heavily rewards **technical depth, Mantle ecosystem fit, business potential, innovation, and UX**; “excellent” projects need a complete business loop and seamless Mantle integration, not just a concept demo. ([docs.google.com][1])

Mantle is EVM-compatible, so you can ship normal Solidity contracts with minimal changes, deploy on Mantle Sepolia/mainnet, and use Mantle as the permanent settlement/reputation layer. ([docs.mantle.xyz][2]) Mantle Sepolia uses chain ID **5003**, RPC `rpc.sepolia.mantle.xyz`, and explorer `sepolia.mantlescan.xyz`, which is perfect for the deployment award. ([docs.mantle.xyz][3])

Also, a new ERC-8004 paper says early agent identity is still mostly registration-heavy and lacks real operational evidence/reputation. That is exactly the gap this project attacks: **agents need proof of work, proof of outcome, and reputation, not only identity NFTs.** ([arXiv][4])

---

# Core idea

## **Stoa Arena**

A user posts a task:

> “Find suspicious smart-money movement on Mantle.”
> “Optimize this wallet’s gas usage.”
> “Create a conservative mETH/USDY yield strategy.”
> “Audit this contract before I deploy.”

AI agents compete to complete it.

Each agent has:

1. **Agent Passport NFT**
   ERC-8004-style identity: name, model, wallet, skills, creator, repo, metadata.

2. **On-chain decision log**
   Every action writes: prompt hash, output hash, tools used, confidence score, risk score, final tx hash.

3. **Escrow payment**
   User funds the task in MNT. If the agent completes it, it gets paid.

4. **Reputation score**
   Agents earn public scores based on success, speed, safety, PnL/ROI, user rating, and verifier checks.

5. **Live leaderboard**
   “Top Mantle AI Agents” ranked by verifiable performance.

This turns Mantle into the **public scoreboard for autonomous AI agents**.

---

# Best track to submit under

Primary:

## **Agentic Wallets & Economy**

Because this is literally an agent economy: agents have identities, wallets, tasks, payments, reputation, and execution history.

Secondary nomination:

## **AI DevTools**

Because developers can use Stoa Arena to test, benchmark, and monitor their agents before giving them real money.

Optional third angle:

## **AI Alpha & Data**

Demo one agent that detects on-chain anomalies and posts a Telegram/Discord alert.

---

# Killer demo flow

## 2-minute demo

1. **Open Stoa Arena**
   Show landing page:
   “The on-chain reputation layer for AI agents on Mantle.”

2. **Register an agent**
   Create “Atlas,” an AI alpha agent.
   Mint Agent Passport NFT on Mantle Sepolia.

3. **Post a task**
   Example:
   “Monitor Mantle wallet activity and detect a whale anomaly.”

4. **Agent runs**
   Backend agent reads on-chain data, produces a decision, and explains the anomaly.

5. **Write proof on-chain**
   Call `recordDecision()` on Mantle.
   Show tx on Mantle explorer.

6. **Release escrow**
   Task contract pays the agent.

7. **Leaderboard updates**
   Atlas gains reputation:
   `+12 accuracy`, `+8 safety`, `+5 speed`.

8. **Share card**
   “Atlas just completed a verified Mantle AI task.”
   This helps community voting.

---

# Contracts you need

Keep it simple:

## `AgentRegistry.sol`

Mints agent identity NFTs.

Fields:

```solidity
agentId
owner
agentWallet
metadataURI
skillsHash
createdAt
```

## `TaskEscrow.sol`

Users post paid tasks.

Functions:

```solidity
createTask(descriptionHash, rewardAmount)
acceptTask(taskId, agentId)
completeTask(taskId, resultHash)
releasePayment(taskId)
```

## `DecisionLedger.sol`

This is the most important contract.

Functions:

```solidity
recordDecision(
  uint256 agentId,
  uint256 taskId,
  bytes32 promptHash,
  bytes32 outputHash,
  bytes32 toolsHash,
  uint256 confidence,
  uint256 riskScore,
  string memory actionType
)
```

## `ReputationOracle.sol`

For hackathon MVP, your backend/verifier can call this.

```solidity
submitScore(agentId, taskId, accuracy, safety, speed, userRating)
```

Do not overbuild the contracts. The win is the **complete loop**.

---

# AI part

Use one or two agents only.

## Agent 1: **Alpha Agent**

Detects unusual wallet/token activity on Mantle.

Input:

```txt
Find suspicious wallet movement in the last N blocks.
Explain why it matters.
Return risk score and confidence.
```

Output:

```json
{
  "summary": "Wallet X moved large MNT into protocol Y",
  "confidence": 82,
  "riskScore": 61,
  "recommendedAction": "watchlist",
  "sources": ["tx1", "tx2", "contract"]
}
```

Then hash this JSON and write it to `DecisionLedger`.

## Agent 2: **RWA/Yield Agent**

Creates a conservative allocation idea using Mantle ecosystem assets like mETH/USDY. Mantle explicitly positions mETH and USDY as important ecosystem assets, so this gives strong ecosystem fit. ([mantle.xyz][5])

Do not promise real yield execution unless you have time. For MVP, make it:

> “AI generates strategy → risk engine checks → decision recorded on-chain.”

Stretch: add real swap/deposit adapter later.

---

# Byreal angle

Byreal docs say its AI Agent CLI gives OpenClaw agents skills like copy farming, pool analysis, token discovery, swap execution, position management, and wallet management. ([docs.byreal.io][6])

So add this as a **plugin adapter**, not the core:

> “Stoa agents can use Byreal Skills CLI as an execution tool, then settle proof/reputation on Mantle.”

This makes sponsor alignment stronger without making the whole project dependent on Byreal.

---

# Frontend pages

Keep UI beautiful and simple.

## `/`

Hero:

> **AI agents can now earn reputation on-chain.**
> Stoa Arena lets agents complete tasks, get paid, and build verifiable performance history on Mantle.

Buttons:

* Launch Arena
* Register Agent
* Post Task

## `/arena`

Cards:

* Active Tasks
* Available Agents
* Recent Decisions
* Leaderboard

## `/agent/atlas`

Show:

* Agent Passport NFT
* Skills
* Wallet
* Completed tasks
* Reputation chart
* On-chain decision history

## `/task/1`

Show:

* Task prompt
* Escrow amount
* Agent response
* Proof hash
* Mantle tx link
* Pay/release button

---

# Why this beats normal hackathon ideas

Bad idea:

> “AI trading bot that swaps tokens.”

Problem: everyone will build that. Judging depends on ROI, market conditions, and demo luck.

Better idea:

> “A Mantle-native reputation and payment layer for every AI agent.”

That hits:

* **Technical depth:** contracts + AI + verifier + frontend.
* **Innovation:** proof-of-performance agent economy.
* **Mantle ecosystem:** all identities, tasks, payments, and logs live on Mantle.
* **Business:** protocols can use it to benchmark agents; agents can monetize; users can hire agents.
* **UX:** simple marketplace + leaderboard.

---

# MVP build plan

## Day 1 — contracts

Ship:

* `AgentRegistry`
* `TaskEscrow`
* `DecisionLedger`
* Deploy to Mantle Sepolia
* Verify contracts on explorer

## Day 2 — agent backend

Ship:

* One real AI agent
* One deterministic verifier
* `recordDecision()` call
* Simple scoring engine

## Day 3 — frontend + demo

Ship:

* Vercel frontend
* Agent profile
* Task creation
* Live tx links
* Leaderboard
* 2-minute demo video

---

# Submission positioning

Use this exact framing:

> **Stoa Arena is the verifiable work layer for AI agents on Mantle.**
> Today, agent identity alone is not enough. Agents need proof that they can complete tasks, act safely, and create measurable value. Stoa Arena lets users post paid tasks, lets agents execute them, and records every decision, result, payment, and reputation update on Mantle.

# Final recommendation

Build **Stoa Arena**.

Not another bot.
Not another dashboard.
A full **agent economy primitive**:

**identity → task → AI execution → on-chain proof → escrow payment → reputation → leaderboard.**

That is the kind of project that can compete for **Agentic Economy**, **AI DevTools**, **Best UI/UX**, **Deployment Award**, and maybe **Grand Champion**.

[1]: https://docs.google.com/spreadsheets/d/1TMWhQ8cKp_1NF1ZelxtBGIF6l3bQZTA0ipjSREiqRhM/edit?gid=1857369098 "Judging Criteria of AI Awakening - Google Sheets"
[2]: https://docs.mantle.xyz/network "Overviews | Network"
[3]: https://docs.mantle.xyz/network/for-developers/quick-access "Quick Access | Network"
[4]: https://arxiv.org/abs/2606.12128?utm_source=chatgpt.com "From Agent Identity to Agent Economy: Measuring the Operational Readiness of ERC-8004 AI Agents"
[5]: https://mantle.xyz/ "Mantle Network | Building the Liquidity Chain of the Future"
[6]: https://docs.byreal.io/byreal-ai-agent/ai-agent-skills "AI Agent Skills | Byreal"
