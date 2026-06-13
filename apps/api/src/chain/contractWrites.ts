import type { Hex } from "viem";
import type {
  RecordDecisionParams,
  SubmitResultParams,
  SubmitScoreParams,
} from "@spartarena/sdk";
import { SpartArenaClient, loadAddressesFromEnv } from "@spartarena/sdk";
import { env, hasContractAddresses } from "../env.js";
import { ServiceUnavailableError, UpstreamError } from "../lib/errors.js";
import { childLogger } from "../lib/logger.js";
import { publicClient } from "./publicClient.js";
import { getReadClient, getWriteClient } from "./client.js";
import { getVerifierSigner } from "./walletClient.js";

/**
 * Error-wrapped write helpers over the SDK client.
 *
 * Writes that require the backend signer use the cached write client; reputation
 * scoring uses a dedicated verifier-bound client (the verifier is a separate
 * authorised role on-chain). All helpers throw {@link ServiceUnavailableError}
 * when the relevant signer/addresses are missing, and {@link UpstreamError} on
 * a revert or RPC failure — both mapped to clean HTTP responses upstream.
 */
const log = childLogger("chain.writes");

async function guardWrite<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    log.error({ err, label }, "Chain write failed");
    throw new UpstreamError(`Chain write failed: ${label}`);
  }
}

/** Record a decision proof in the DecisionLedger (backend writer). */
export async function writeDecision(params: RecordDecisionParams): Promise<Hex> {
  const client = getWriteClient();
  if (!client) {
    throw new ServiceUnavailableError(
      "On-chain writes unavailable: configure BACKEND_SIGNER_PRIVATE_KEY and contract addresses.",
    );
  }
  return guardWrite("recordDecision", () => client.recordDecision(params));
}

/** Submit a task result hash to the TaskEscrow (backend writer). */
export async function writeResult(params: SubmitResultParams): Promise<Hex> {
  const client = getWriteClient();
  if (!client) {
    throw new ServiceUnavailableError(
      "On-chain writes unavailable: configure BACKEND_SIGNER_PRIVATE_KEY and contract addresses.",
    );
  }
  return guardWrite("submitResult", () => client.submitResult(params));
}

/** Mark a task verified in the TaskEscrow (backend writer). */
export async function writeVerifyTask(taskId: bigint): Promise<Hex> {
  const client = getWriteClient();
  if (!client) {
    throw new ServiceUnavailableError(
      "On-chain writes unavailable: configure BACKEND_SIGNER_PRIVATE_KEY and contract addresses.",
    );
  }
  return guardWrite("verifyTask", () => client.verifyTask(taskId));
}

/** Release escrowed payment for a verified task (backend writer). */
export async function writeReleasePayment(taskId: bigint): Promise<Hex> {
  const client = getWriteClient();
  if (!client) {
    throw new ServiceUnavailableError(
      "On-chain writes unavailable: configure BACKEND_SIGNER_PRIVATE_KEY and contract addresses.",
    );
  }
  return guardWrite("releasePayment", () => client.releasePayment(taskId));
}

let verifierClient: SpartArenaClient | undefined;

/** A SpartArenaClient bound to the verifier signer, or `undefined`. */
function getVerifierClient(): SpartArenaClient | undefined {
  if (verifierClient) return verifierClient;
  if (!hasContractAddresses(env)) return undefined;
  const wallet = getVerifierSigner();
  if (!wallet) return undefined;
  const addresses = loadAddressesFromEnv(
    env as unknown as Record<string, string | undefined>,
  );
  verifierClient = new SpartArenaClient({
    publicClient,
    walletClient: wallet,
    addresses,
  });
  return verifierClient;
}

/** Submit a reputation score (verifier role). */
export async function writeScore(params: SubmitScoreParams): Promise<Hex> {
  const client = getVerifierClient();
  if (!client) {
    throw new ServiceUnavailableError(
      "Reputation scoring unavailable: configure VERIFIER_PRIVATE_KEY and contract addresses.",
    );
  }
  return guardWrite("submitScore", () => client.submitScore(params));
}

/** Re-exported for callers that only need read availability checks. */
export { getReadClient };
