function requireEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing ${name} — copy frontend/.env.example to .env and fill it in.`);
  }
  return value;
}

export const config = {
  networkPassphrase: requireEnv("VITE_NETWORK_PASSPHRASE"),
  rpcUrl: requireEnv("VITE_RPC_URL"),
  tokenAId: requireEnv("VITE_TOKEN_A_ID"),
  tokenBId: requireEnv("VITE_TOKEN_B_ID"),
  stakePoolId: requireEnv("VITE_STAKE_POOL_ID"),
};

/** How often (ms) to re-poll `earned` / pool state for the live-ticking display. */
export const POLL_INTERVAL_MS = 12_000;

export const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
