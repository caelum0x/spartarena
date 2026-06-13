import { createWalletClient, http, type Account } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChainById, mantleSepolia, type SpartArenaWalletClient } from "@spartarena/sdk";
import { env } from "../env.js";

/**
 * Wallet clients for the two privileged backend roles.
 *
 * • `backendSigner` — authorised DecisionLedger / TaskEscrow writer.
 * • `verifierSigner` — authorised ReputationEngine score submitter.
 *
 * Both are lazily constructed and only available when their private key is set,
 * so an operator can run a read-only API without any keys. The SDK's
 * {@link SpartArenaWalletClient} expects `chain: undefined` with a bound account,
 * so we construct chainless clients (the chain is supplied per-transaction by the
 * SDK helpers via the public client's chain) — viem still routes over the
 * configured transport.
 */

function resolveChain() {
  return getChainById(env.CHAIN_ID) ?? mantleSepolia;
}

function buildWalletClient(privateKey: `0x${string}`): SpartArenaWalletClient {
  const account: Account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: resolveChain(),
    transport: http(env.RPC_URL),
  });
  // The SDK types the wallet client with `chain: undefined`; viem's concrete
  // client carries the chain at runtime, which is what the SDK write helpers
  // rely on. We narrow to the SDK's expected shape here.
  return client as unknown as SpartArenaWalletClient;
}

let backendSignerClient: SpartArenaWalletClient | undefined;
let verifierSignerClient: SpartArenaWalletClient | undefined;

/** The backend writer wallet client, or `undefined` if no key is configured. */
export function getBackendSigner(): SpartArenaWalletClient | undefined {
  if (env.BACKEND_SIGNER_PRIVATE_KEY === undefined) return undefined;
  backendSignerClient ??= buildWalletClient(
    env.BACKEND_SIGNER_PRIVATE_KEY as `0x${string}`,
  );
  return backendSignerClient;
}

/** The verifier wallet client, or `undefined` if no key is configured. */
export function getVerifierSigner(): SpartArenaWalletClient | undefined {
  if (env.VERIFIER_PRIVATE_KEY === undefined) return undefined;
  verifierSignerClient ??= buildWalletClient(
    env.VERIFIER_PRIVATE_KEY as `0x${string}`,
  );
  return verifierSignerClient;
}

/** Address of the backend signer, if configured. */
export function backendSignerAddress(): `0x${string}` | undefined {
  return getBackendSigner()?.account.address;
}

/** Address of the verifier signer, if configured. */
export function verifierSignerAddress(): `0x${string}` | undefined {
  return getVerifierSigner()?.account.address;
}
