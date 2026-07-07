import { config } from "../config";
import { callContractFunction } from "./contract";

export interface PoolState {
  token_a: string;
  token_b: string;
  reward_rate: bigint;
  total_staked: bigint;
  reward_per_token_stored: bigint;
  last_update_time: bigint;
  admin: string;
}

export interface UserData {
  staked_amount: bigint;
  reward_per_token_paid: bigint;
  rewards_owed: bigint;
}

// ---------------------------------------------------------------------
// Read-only views (no wallet connection required)
// ---------------------------------------------------------------------

export function fetchPoolState(): Promise<PoolState> {
  return callContractFunction<PoolState>({
    contractId: config.stakePoolId,
    method: "get_pool_state",
  });
}

export function fetchEarned(user: string): Promise<bigint> {
  return callContractFunction<bigint>({
    contractId: config.stakePoolId,
    method: "earned",
    args: { user },
  });
}

export function fetchUserData(user: string): Promise<UserData> {
  return callContractFunction<UserData>({
    contractId: config.stakePoolId,
    method: "get_user_data",
    args: { user },
  });
}

export function fetchTokenBalance(tokenId: string, id: string): Promise<bigint> {
  return callContractFunction<bigint>({
    contractId: tokenId,
    method: "balance",
    args: { id },
  });
}

// ---------------------------------------------------------------------
// Writes (require a connected wallet; simulate -> sign -> send)
// ---------------------------------------------------------------------

export async function stake(user: string, amount: bigint): Promise<void> {
  await callContractFunction<void>({
    contractId: config.stakePoolId,
    method: "stake",
    args: { user, amount },
    publicKey: user,
  });
}

export async function unstake(user: string, amount: bigint): Promise<void> {
  await callContractFunction<void>({
    contractId: config.stakePoolId,
    method: "unstake",
    args: { user, amount },
    publicKey: user,
  });
}

export function claimReward(user: string): Promise<bigint> {
  return callContractFunction<bigint>({
    contractId: config.stakePoolId,
    method: "claim_reward",
    args: { user },
    publicKey: user,
  });
}
