import { Client as ContractClient } from "@stellar/stellar-sdk/contract";
import { networkPassphrase } from "./stellar-sdk";
import { config } from "../config";
import { signTransaction } from "./wallet";

/**
 * A dynamically-generated client (via `Client.from`, which fetches the
 * contract's spec straight from the ledger) has no compile-time knowledge of
 * contract-specific methods, so invocation goes through this indexed type,
 * kept isolated to this module. Everything outside this module gets a fully
 * typed API (see contracts.ts).
 */
interface DynamicMethodResult {
  isReadCall: boolean;
  result: unknown;
  signAndSend: () => Promise<{ result: unknown }>;
}

type DynamicClient = ContractClient &
  Record<string, (args?: Record<string, unknown>) => Promise<DynamicMethodResult>>;

async function getClient(contractId: string, publicKey?: string): Promise<DynamicClient> {
  const client = await ContractClient.from({
    contractId,
    networkPassphrase,
    rpcUrl: config.rpcUrl,
    publicKey,
    signTransaction,
    allowHttp: config.rpcUrl.startsWith("http://"),
  });
  return client as DynamicClient;
}

/** Duck-types the Rust-`Result<T, Error>` wrapper the SDK returns for
 * contract methods that return `Result`, vs. a plain value for methods that
 * don't -- unwrapping (and throwing on Err) only in the former case. */
function unwrapIfResult<T>(value: unknown): T {
  if (
    value !== null &&
    typeof value === "object" &&
    "unwrap" in value &&
    typeof (value as { unwrap: unknown }).unwrap === "function"
  ) {
    return (value as { unwrap: () => T }).unwrap();
  }
  return value as T;
}

export interface CallContractOptions {
  contractId: string;
  method: string;
  args?: Record<string, unknown>;
  /** Signer's address. Omit for read-only/simulate-only calls. */
  publicKey?: string;
}

/**
 * Invokes a single method on a deployed Soroban contract, given its ID.
 * Read-only calls resolve from simulation alone; calls that need signing
 * (any call made with a `publicKey`, where the simulation determines it is
 * not a read call) are automatically signed and submitted.
 */
export async function callContractFunction<T>(options: CallContractOptions): Promise<T> {
  const client = await getClient(options.contractId, options.publicKey);
  const method = client[options.method];
  if (typeof method !== "function") {
    throw new Error(`Contract method "${options.method}" does not exist on this client`);
  }

  const tx = await method(options.args ?? {});
  if (tx.isReadCall) {
    return unwrapIfResult<T>(tx.result);
  }
  const sent = await tx.signAndSend();
  return unwrapIfResult<T>(sent.result);
}
