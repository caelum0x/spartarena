import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Next.js configuration for the SpartArena web app.
 *
 * `transpilePackages` lets the App Router compile the workspace TypeScript
 * packages (`@spartarena/shared`, `@spartarena/sdk`, `@spartarena/byreal-adapter`)
 * directly from source so we don't need a separate build step for them during
 * local dev or `next build`.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: repoRoot,
  transpilePackages: [
    "@spartarena/shared",
    "@spartarena/sdk",
    "@spartarena/byreal-adapter",
  ],
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  webpack: (config) => {
    // The @spartarena/sdk source uses explicit `.js` ESM specifiers (NodeNext
    // style) but ships as raw TypeScript via `transpilePackages`. Map `.js`
    // import specifiers back to their `.ts`/`.tsx` sources so webpack resolves
    // them. Order matters: real `.js`/`.jsx` files must still win.
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      // Optional React Native storage used by @metamask/sdk. The web app uses
      // injected browser wallets, so this native-only module must not be bundled.
      "@react-native-async-storage/async-storage": false,
    };
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    // wagmi/viem pull in optional WalletConnect deps we don't bundle; ignore them.
    config.externals = [...(config.externals ?? []), "pino-pretty", "lokijs", "encoding"];
    return config;
  },
};

export default nextConfig;
