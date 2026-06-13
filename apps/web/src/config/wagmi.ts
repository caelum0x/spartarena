import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { mantleSepolia, localAnvil } from "./chains";
import { env } from "./env";

/**
 * wagmi v2 config for SpartArena.
 *
 * Uses the injected connector (MetaMask / browser wallet) which needs no project
 * id, so the app works out of the box. SSR-safe via cookie storage. RPC transport
 * is read from public env with sane Mantle defaults.
 */
export const wagmiConfig = createConfig({
  chains: [mantleSepolia, localAnvil],
  connectors: [injected({ shimDisconnect: true })],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [mantleSepolia.id]: http(
      env.chainId === mantleSepolia.id ? env.rpcUrl : mantleSepolia.rpcUrls.default.http[0],
    ),
    [localAnvil.id]: http(localAnvil.rpcUrls.default.http[0]),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
