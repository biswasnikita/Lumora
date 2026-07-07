import {
  getAddress,
  isConnected,
  requestAccess,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";
import type { SignTransaction } from "@stellar/stellar-sdk/contract";

export async function isFreighterAvailable(): Promise<boolean> {
  const { isConnected: available } = await isConnected();
  return available;
}

/** Prompts the user to connect Freighter (if not already) and returns their address. */
export async function connectWallet(): Promise<string> {
  const { address, error } = await requestAccess();
  if (error || !address) {
    throw new Error(error?.message ?? "Failed to connect Freighter wallet");
  }
  return address;
}

/** Returns the currently connected address, if the app is already authorized. */
export async function getConnectedAddress(): Promise<string | null> {
  const { address, error } = await getAddress();
  if (error || !address) return null;
  return address;
}

/** Adapts Freighter's signTransaction to the shape stellar-sdk's contract.Client expects. */
export const signTransaction: SignTransaction = async (xdr, opts) => {
  const result = await freighterSignTransaction(xdr, {
    networkPassphrase: opts?.networkPassphrase,
    address: opts?.address,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return { signedTxXdr: result.signedTxXdr, signerAddress: result.signerAddress };
};
