use soroban_sdk::{contracterror, contracttype, Address};

/// Fixed-point scaling factor applied to `reward_per_token_stored` so that
/// integer division in the accumulator math doesn't collapse small
/// per-second reward rates to zero. Reversed (divided back out) whenever a
/// user's earned amount is computed.
pub const SCALE: i128 = 1_000_000_000_000_000_000;

#[derive(Clone)]
#[contracttype]
pub struct PoolState {
    pub token_a: Address,
    pub token_b: Address,
    pub reward_rate: i128,
    pub total_staked: i128,
    pub reward_per_token_stored: i128,
    pub last_update_time: u64,
    pub admin: Address,
}

#[derive(Clone)]
#[contracttype]
pub struct UserData {
    pub staked_amount: i128,
    pub reward_per_token_paid: i128,
    pub rewards_owed: i128,
}

impl UserData {
    pub fn default_for(_env: &soroban_sdk::Env) -> Self {
        UserData {
            staked_amount: 0,
            reward_per_token_paid: 0,
            rewards_owed: 0,
        }
    }
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Pool,
    User(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAdmin = 3,
    ZeroAmount = 4,
    InsufficientStake = 5,
    InsufficientRewardPool = 6,
}
