import { explorerTx } from "@spartarena/shared";
import { env } from "../../env.js";
import { childLogger } from "../../lib/logger.js";
import { telegramService, escapeMarkdownV2 as esc, escapeMarkdownV2Url as escUrl } from "./telegram.service.js";
import { discordService } from "./discord.service.js";

/**
 * NotificationService — brand-voiced lifecycle announcer.
 *
 * Formats SpartArena events in the arena voice (Spartans / Battles / Glory /
 * Honor) and fans them out to every configured channel. Channels that are
 * unconfigured no-op silently. Sending is always best-effort: this service
 * never throws into the lifecycle caller, so a failed alert can never break a
 * decision write, verification, or indexer pass.
 */
const log = childLogger("notifications");

/** Which delivery channels acknowledged a fan-out. */
export interface DeliveryResult {
  readonly telegram: boolean;
  readonly discord: boolean;
}

/** Whether each channel is configured (never leaks the token/secret). */
export interface NotificationStatus {
  readonly telegram: boolean;
  readonly discord: boolean;
}

/** A Battle that a Spartan just completed (decision recorded / result submitted). */
export interface BattleCompletedEvent {
  readonly agentName: string;
  readonly chainTaskId?: number | null;
  readonly confidence: number;
  readonly riskScore: number;
  readonly onChain: boolean;
  readonly decisionTxHash?: string | null;
  readonly resultTxHash?: string | null;
}

/** A Battle the Oracle Judge has verified. */
export interface BattleVerifiedEvent {
  readonly chainTaskId: number;
  readonly title?: string;
  readonly txHash?: string | null;
}

/** A Spartan whose bond was slashed (indexed from AgentStaking). */
export interface SlashEvent {
  readonly chainAgentId: number;
  readonly amountWei: string;
  readonly newBondWei: string;
  readonly reason?: string;
  readonly txHash?: string | null;
}

/**
 * A message rendered for each channel. Telegram requires MarkdownV2 (every
 * reserved char escaped); Discord uses lenient markdown, so it gets the plain
 * composed string. Building both from the same data keeps the two in sync.
 */
interface ChannelMessage {
  readonly telegram: string;
  readonly discord: string;
}

/** Telegram MarkdownV2 helpers — escape dynamic/static text, wrap with markup. */
const tg = {
  t: (s: string): string => esc(s),
  b: (s: string): string => `*${esc(s)}*`,
  i: (s: string): string => `_${esc(s)}_`,
  link: (label: string, url: string): string => `[${esc(label)}](${escUrl(url)})`,
};

/** Append a "View on explorer" line per channel when a tx hash is available. */
function txLines(txHash?: string | null): ChannelMessage {
  if (!txHash) return { telegram: "", discord: "" };
  const url = explorerTx(env.CHAIN_ID, txHash);
  if (!url) return { telegram: "", discord: "" };
  return {
    telegram: `\n${tg.link("View on the War Chronicle", url)}`,
    discord: `\n[View on the War Chronicle](${url})`,
  };
}

/** Fan a per-channel message out to every configured channel. */
async function fanOut(message: ChannelMessage): Promise<DeliveryResult> {
  const [telegram, discord] = await Promise.all([
    telegramService.send(message.telegram),
    discordService.send(message.discord),
  ]);
  log.debug({ telegram, discord }, "Notification fan-out complete");
  return { telegram, discord };
}

export const notificationService = {
  /** Channel configuration (booleans only — never the secret values). */
  status(): NotificationStatus {
    return { telegram: telegramService.enabled, discord: discordService.enabled };
  },

  /** Raw fan-out for callers that already hold a formatted message. */
  async notifyAll(message: string): Promise<DeliveryResult> {
    // Telegram needs MarkdownV2-safe text; escape the whole raw string for it.
    return fanOut({ telegram: esc(message), discord: message });
  },

  /** A Spartan has returned victorious from the arena with a verdict. */
  async battleCompleted(e: BattleCompletedEvent): Promise<DeliveryResult> {
    const battle = e.chainTaskId != null ? `Battle #${e.chainTaskId}` : "a Battle";
    const realm = e.onChain ? " — sealed on Mantle" : "";
    const tx = txLines(e.decisionTxHash ?? e.resultTxHash ?? null);
    return fanOut({
      telegram:
        `⚔️ ${tg.b(e.agentName)} has fought ${tg.t(battle)} to its end${tg.t(realm)}\\.\n` +
        `Glory \\(confidence\\): ${tg.b(String(e.confidence))} · Peril \\(risk\\): ${tg.b(String(e.riskScore))}` +
        tx.telegram,
      discord:
        `⚔️ **${e.agentName}** has fought ${battle} to its end${realm}.\n` +
        `Glory (confidence): **${e.confidence}** · Peril (risk): **${e.riskScore}**` +
        tx.discord,
    });
  },

  /** The Oracle Judge has ruled on a Battle. */
  async battleVerified(e: BattleVerifiedEvent): Promise<DeliveryResult> {
    const name = e.title ?? `Battle #${e.chainTaskId}`;
    const tx = txLines(e.txHash ?? null);
    return fanOut({
      telegram:
        `🏛️ The Oracle Judge has ruled: ${tg.b(name)} stands ${tg.b("Verified")}\\.\n` +
        `Honor is earned; the Battle Vault opens\\.` +
        tx.telegram,
      discord:
        `🏛️ The Oracle Judge has ruled: **${name}** stands **Verified**.\n` +
        `Honor is earned; the Battle Vault opens.` +
        tx.discord,
    });
  },

  /** A Spartan's bond was slashed. */
  async slashRecorded(e: SlashEvent): Promise<DeliveryResult> {
    const tx = txLines(e.txHash ?? null);
    return fanOut({
      telegram:
        `🩸 ${tg.b(`Spartan #${e.chainAgentId}`)} has been slashed — ${tg.b(`${e.amountWei} wei`)} forfeited from its bond\\.` +
        (e.reason ? ` Reason: ${tg.i(e.reason)}\\.` : "") +
        `\nRemaining bond: ${tg.b(`${e.newBondWei} wei`)}\\.` +
        tx.telegram,
      discord:
        `🩸 **Spartan #${e.chainAgentId}** has been slashed — **${e.amountWei}** wei forfeited from its bond.` +
        (e.reason ? ` Reason: _${e.reason}_.` : "") +
        `\nRemaining bond: **${e.newBondWei}** wei.` +
        tx.discord,
    });
  },
};

export type NotificationService = typeof notificationService;
