import { Server } from "@stellar/stellar-sdk/rpc";
import { config } from "../config";

/** Network passphrase every transaction in this app is built and signed against. */
export const networkPassphrase = config.networkPassphrase;

/**
 * Soroban RPC server for this app's configured network. `contract.Client`
 * (used in contract.ts) manages its own internal RPC connection per call,
 * but this shared instance is exposed for any direct ledger/health queries
 * outside the contract-invocation path.
 */
export const server = new Server(config.rpcUrl, {
  allowHttp: config.rpcUrl.startsWith("http://"),
});
