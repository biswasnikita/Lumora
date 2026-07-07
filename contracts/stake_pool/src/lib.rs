#![no_std]

//! StakePool: stake Token A, earn Token B continuously, using the
//! Synthetix-style "reward-per-token accumulator" pattern.
//!
//! The core trick: instead of iterating over every staker to distribute
//! rewards, the contract tracks one pool-wide accumulator
//! (`reward_per_token_stored`) that increases over time in proportion to
//! `reward_rate / total_staked`. Each user's earned rewards are computed
//! lazily, on interaction, as `staked_amount * (accumulator_now -
//! accumulator_at_last_interaction)`. See `math.rs` for the implementation
//! and the project README for the full derivation.

mod events;
mod math;
mod storage;
mod types;

#[cfg(test)]
mod test;

use events::{RewardClaimed, RewardRateUpdated, RewardsFunded, Staked, Unstaked};
use math::{checkpoint, earned, reward_per_token};
use soroban_sdk::{contract, contractimpl, token, Address, Env};
use storage::{get_pool, get_user, has_pool, set_pool, set_user};
use types::{Error, PoolState, UserData};

#[contract]
pub struct StakePool;

#[contractimpl]
impl StakePool {
    /// One-time setup. `reward_rate` is the amount of Token B distributed
    /// per second across the whole pool (not per user).
    pub fn init(
        env: Env,
        admin: Address,
        token_a: Address,
        token_b: Address,
        reward_rate: i128,
    ) -> Result<(), Error> {
        if has_pool(&env) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        let pool = PoolState {
            token_a,
            token_b,
            reward_rate,
            total_staked: 0,
            reward_per_token_stored: 0,
            last_update_time: env.ledger().timestamp(),
            admin,
        };
        set_pool(&env, &pool);
        Ok(())
    }

    /// Admin deposits Token B into the contract to be paid out to stakers
    /// over time. Does not itself change the reward rate or accumulator.
    pub fn fund_rewards(env: Env, admin: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }
        let pool = get_pool(&env)?;
        if admin != pool.admin {
            return Err(Error::NotAdmin);
        }
        admin.require_auth();

        let token_b = token::Client::new(&env, &pool.token_b);
        token_b.transfer(&admin, &env.current_contract_address(), &amount);

        RewardsFunded {
            amount,
            funded_by: admin,
        }
        .publish(&env);
        Ok(())
    }

    /// Stakes `amount` of Token A on behalf of `user`.
    pub fn stake(env: Env, user: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }
        user.require_auth();

        let mut pool = get_pool(&env)?;
        let mut user_data = get_user(&env, &user);

        checkpoint(&env, &mut pool, &mut user_data);

        let token_a = token::Client::new(&env, &pool.token_a);
        token_a.transfer(&user, &env.current_contract_address(), &amount);

        user_data.staked_amount += amount;
        pool.total_staked += amount;

        set_pool(&env, &pool);
        set_user(&env, &user, &user_data);

        Staked {
            user,
            amount,
            total_staked: pool.total_staked,
        }
        .publish(&env);
        Ok(())
    }

    /// Unstakes `amount` of Token A back to `user`. Pending rewards accrued
    /// up to this point are checkpointed (not paid out) before the
    /// principal moves.
    pub fn unstake(env: Env, user: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }
        user.require_auth();

        let mut pool = get_pool(&env)?;
        let mut user_data = get_user(&env, &user);

        if amount > user_data.staked_amount {
            return Err(Error::InsufficientStake);
        }

        checkpoint(&env, &mut pool, &mut user_data);

        user_data.staked_amount -= amount;
        pool.total_staked -= amount;

        let token_a = token::Client::new(&env, &pool.token_a);
        token_a.transfer(&env.current_contract_address(), &user, &amount);

        set_pool(&env, &pool);
        set_user(&env, &user, &user_data);

        Unstaked {
            user,
            amount,
            total_staked: pool.total_staked,
        }
        .publish(&env);
        Ok(())
    }

    /// Pays out `user`'s currently accrued Token B rewards. Returns the
    /// amount paid (0 if nothing was owed — claiming with no rewards is a
    /// no-op rather than an error).
    pub fn claim_reward(env: Env, user: Address) -> Result<i128, Error> {
        user.require_auth();

        let mut pool = get_pool(&env)?;
        let mut user_data = get_user(&env, &user);

        checkpoint(&env, &mut pool, &mut user_data);

        let amount = user_data.rewards_owed;
        if amount == 0 {
            set_pool(&env, &pool);
            set_user(&env, &user, &user_data);
            return Ok(0);
        }

        let token_b = token::Client::new(&env, &pool.token_b);
        let contract_balance = token_b.balance(&env.current_contract_address());
        if contract_balance < amount {
            return Err(Error::InsufficientRewardPool);
        }

        user_data.rewards_owed = 0;
        token_b.transfer(&env.current_contract_address(), &user, &amount);

        set_pool(&env, &pool);
        set_user(&env, &user, &user_data);

        RewardClaimed { user, amount }.publish(&env);
        Ok(amount)
    }

    /// Read-only: currently claimable Token B reward for `user`, projected
    /// to the current ledger timestamp. Does not modify state.
    pub fn earned(env: Env, user: Address) -> Result<i128, Error> {
        let pool = get_pool(&env)?;
        let user_data = get_user(&env, &user);
        let current_rpt = reward_per_token(&env, &pool);
        Ok(earned(&user_data, current_rpt))
    }

    /// Read-only: pool-wide state (total staked, reward rate, etc).
    pub fn get_pool_state(env: Env) -> Result<PoolState, Error> {
        get_pool(&env)
    }

    /// Read-only: a user's raw staking record.
    pub fn get_user_data(env: Env, user: Address) -> UserData {
        get_user(&env, &user)
    }

    /// Admin-only: updates the pool-wide reward rate. Checkpoints the
    /// accumulator under the OLD rate first so the change only affects
    /// accrual going forward, never retroactively.
    pub fn set_reward_rate(env: Env, admin: Address, new_rate: i128) -> Result<(), Error> {
        let mut pool = get_pool(&env)?;
        if admin != pool.admin {
            return Err(Error::NotAdmin);
        }
        admin.require_auth();

        pool.reward_per_token_stored = reward_per_token(&env, &pool);
        pool.last_update_time = env.ledger().timestamp();

        let old_rate = pool.reward_rate;
        pool.reward_rate = new_rate;
        set_pool(&env, &pool);

        RewardRateUpdated { old_rate, new_rate }.publish(&env);
        Ok(())
    }
}
