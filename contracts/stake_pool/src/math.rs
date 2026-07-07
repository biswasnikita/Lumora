use crate::types::{PoolState, UserData, SCALE};
use soroban_sdk::Env;

/// Projects `reward_per_token_stored` forward to the current ledger time
/// without mutating anything. Pure function so it can be reused by both the
/// read-only `earned`/`get_pool_state` views and the mutating checkpoint.
pub fn reward_per_token(env: &Env, pool: &PoolState) -> i128 {
    if pool.total_staked == 0 {
        return pool.reward_per_token_stored;
    }
    let now = env.ledger().timestamp();
    let time_elapsed = now.saturating_sub(pool.last_update_time) as i128;
    let reward_added = time_elapsed * pool.reward_rate;
    pool.reward_per_token_stored + (reward_added * SCALE) / pool.total_staked
}

/// Earned-but-unclaimed rewards for a user, given a (possibly projected)
/// `current_rpt` value. Pure function, no storage access.
pub fn earned(user_data: &UserData, current_rpt: i128) -> i128 {
    user_data.rewards_owed
        + (user_data.staked_amount * (current_rpt - user_data.reward_per_token_paid)) / SCALE
}

/// Checkpoints the global accumulator and the user's accrued rewards. Must
/// be called before any change to `pool.total_staked` or
/// `user_data.staked_amount` so the accrual up to `now` is computed against
/// the OLD staked amounts, not the new ones.
pub fn checkpoint(env: &Env, pool: &mut PoolState, user_data: &mut UserData) {
    let current_rpt = reward_per_token(env, pool);
    pool.reward_per_token_stored = current_rpt;
    pool.last_update_time = env.ledger().timestamp();
    user_data.rewards_owed = earned(user_data, current_rpt);
    user_data.reward_per_token_paid = current_rpt;
}
