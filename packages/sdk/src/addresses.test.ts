import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import {
  ADDRESS_ENV_KEYS,
  AddressConfigError,
  CONTRACT_NAMES,
  loadAddressesFromEnv,
  parseAddresses,
  type DeploymentFile,
} from "./addresses.js";

const A = (n: number): string =>
  "0x" + n.toString(16).padStart(40, "0"); // lowercase, valid-length EVM address

function fullDeployment(): DeploymentFile {
  return {
    AgentRegistry: A(1),
    TaskEscrow: A(2),
    DecisionLedger: A(3),
    ReputationEngine: A(4),
    SkillRegistry: A(5),
    AgentStaking: A(6),
  };
}

describe("parseAddresses", () => {
  it("validates and checksums every contract address", () => {
    const parsed = parseAddresses(fullDeployment());
    for (const name of CONTRACT_NAMES) {
      expect(parsed[name]).toBe(getAddress(parsed[name])); // already checksummed
    }
    expect(parsed.AgentRegistry).toBe(getAddress(A(1)));
  });

  it("throws AddressConfigError naming a missing contract", () => {
    const bad = { ...fullDeployment(), TaskEscrow: "" };
    expect(() => parseAddresses(bad)).toThrowError(AddressConfigError);
    expect(() => parseAddresses(bad)).toThrow(/TaskEscrow/);
  });

  it("throws on a malformed address", () => {
    const bad = { ...fullDeployment(), DecisionLedger: "0xnothex" };
    expect(() => parseAddresses(bad)).toThrow(/DecisionLedger/);
  });

  it("ignores extra bookkeeping fields (chainId, backendSigner)", () => {
    const withExtra: DeploymentFile = {
      ...fullDeployment(),
      chainId: 5003,
      backendSigner: A(9),
    };
    expect(() => parseAddresses(withExtra)).not.toThrow();
  });
});

describe("loadAddressesFromEnv", () => {
  it("reads the documented NEXT_PUBLIC_*_ADDRESS keys", () => {
    const env: Record<string, string> = {};
    for (const name of CONTRACT_NAMES) env[ADDRESS_ENV_KEYS[name]] = A(7);
    const parsed = loadAddressesFromEnv(env);
    expect(parsed.SkillRegistry).toBe(getAddress(A(7)));
  });

  it("fails fast when an env key is unset", () => {
    expect(() => loadAddressesFromEnv({})).toThrow(AddressConfigError);
  });
});
