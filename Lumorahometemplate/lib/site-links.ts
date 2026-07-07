/**
 * Real external destinations referenced across the landing page.
 *
 * DAPP_URL points at the local Vite dev server for the actual StakePool
 * dApp (../frontend) -- update this once it has a real deployed URL.
 *
 * Uses 127.0.0.1 explicitly, not "localhost": the dApp's dev server binds
 * only to the IPv4 loopback (`vite --host 127.0.0.1`), but "localhost" can
 * resolve to the IPv6 loopback (::1) first, where an unrelated project's
 * dev server may happen to be listening on the same port instead.
 */
export const DAPP_URL = "http://127.0.0.1:5173";

/** The live, deployed StakePool contract on Stellar Testnet. */
export const CONTRACT_EXPLORER_URL =
  "https://stellar.expert/explorer/testnet/contract/CDUU2DFCM2ZA3AC5KAIL5CTNJ5IFZBE5DKC3DKLN3NMPAMOBIIPOWOEO";
