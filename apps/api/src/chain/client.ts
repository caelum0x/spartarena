import {
  SpartArenaClient,
  loadAddressesFromEnv,
  type SpartArenaAddresses,
} from "@spartarena/sdk";
import { env, hasContractAddresses } from "../env.js";
import { childLogger } from "../lib/logger.js";
import { publicClient } from "./publicClient.js";
import { getBackendSigner } from "./walletClient.js";

/**
 * Lazily-built {@link SpartArenaClient} instances.
 *
 * The client is only constructible when all five contract addresses are present.
 * `getReadClient` returns a read-only client (public client only); `getWriteClient`
 * additionally binds the backend signer and returns `undefined` when writes are
 * not possible, letting callers fall back to compute-only behaviour instead of
 * crashing.
 */
const log = childLogger("chain");

let cachedAddresses: SpartArenaAddresses | undefined;
let readClient: SpartArenaClient | undefined;
let writeClient: SpartArenaClient | undefined;

function resolveAddresses(): SpartArenaAddresses | undefined {
  if (!hasContractAddresses(env)) return undefined;
  if (cachedAddresses) return cachedAddresses;
  try {
    cachedAddresses = loadAddressesFromEnv(
      env as unknown as Record<string, string | undefined>,
    );
    return cachedAddresses;
  } catch (err) {
    log.warn({ err }, "Failed to parse contract addresses from env");
    return undefined;
  }
}

/** Read-only SDK client, or `undefined` when addresses are unset. */
export function getReadClient(): SpartArenaClient | undefined {
  if (readClient) return readClient;
  const addresses = resolveAddresses();
  if (!addresses) return undefined;
  readClient = new SpartArenaClient({ publicClient, addresses });
  return readClient;
}

/** Write-capable SDK client (backend signer bound), or `undefined`. */
export function getWriteClient(): SpartArenaClient | undefined {
  if (writeClient) return writeClient;
  const addresses = resolveAddresses();
  const wallet = getBackendSigner();
  if (!addresses || !wallet) return undefined;
  writeClient = new SpartArenaClient({
    publicClient,
    walletClient: wallet,
    addresses,
  });
  return writeClient;
}

/** Whether chain reads are available. */
export function canRead(): boolean {
  return getReadClient() !== undefined;
}

/** Whether chain writes are available. */
export function canWrite(): boolean {
  return getWriteClient() !== undefined;
}
