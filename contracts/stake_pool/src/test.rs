#![cfg(test)]

use crate::types::Error;
use crate::{StakePool, StakePoolClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Env, String,
};
use token::{Token, TokenClient};

struct Setup<'a> {
    env: Env,
    pool: StakePoolClient<'a>,
    token_a: TokenClient<'a>,
    token_b: TokenClient<'a>,
    admin: Address,
}

/// Spins up fresh Token A / Token B contracts and an initialized StakePool
/// wired to them, with `reward_rate` tokens/sec pool-wide.
fn setup(reward_rate: i128) -> Setup<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);

    let token_a_id = env.register(Token, ());
    let token_a = TokenClient::new(&env, &token_a_id);
    token_a.initialize(
        &admin,
        &7,
        &String::from_str(&env, "Token A"),
        &String::from_str(&env, "TKA"),
    );

    let token_b_id = env.register(Token, ());
    let token_b = TokenClient::new(&env, &token_b_id);
    token_b.initialize(
        &admin,
        &7,
        &String::from_str(&env, "Token B"),
        &String::from_str(&env, "TKB"),
    );

    let pool_id = env.register(StakePool, ());
    let pool = StakePoolClient::new(&env, &pool_id);
    pool.init(&admin, &token_a_id, &token_b_id, &reward_rate);

    Setup {
        env,
        pool,
        token_a,
        token_b,
        admin,
    }
}

fn advance(env: &Env, seconds: u64) {
    env.ledger().with_mut(|li| {
        li.timestamp += seconds;
    });
}

fn new_user(env: &Env, token_a: &TokenClient, amount: i128) -> Address {
    let user = Address::generate(env);
    token_a.mint(&user, &amount);
    user
}

// ---------------------------------------------------------------------
// Core lifecycle / admin errors
// ---------------------------------------------------------------------

#[test]
fn test_double_init_fails() {
    let s = setup(100);
    let res = s
        .pool
        .try_init(&s.admin, &s.token_a.address, &s.token_b.address, &100);
    assert_eq!(res, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn test_zero_amount_rejected() {
    let s = setup(100);
    let user = new_user(&s.env, &s.token_a, 1000);

    assert_eq!(s.pool.try_stake(&user, &0), Err(Ok(Error::ZeroAmount)));
    assert_eq!(s.pool.try_stake(&user, &-5), Err(Ok(Error::ZeroAmount)));
}

#[test]
fn test_insufficient_stake_on_unstake() {
    let s = setup(100);
    let user = new_user(&s.env, &s.token_a, 1000);
    s.pool.stake(&user, &100);

    assert_eq!(
        s.pool.try_unstake(&user, &200),
        Err(Ok(Error::InsufficientStake))
    );
}

#[test]
fn test_non_admin_cannot_fund_or_set_rate() {
    let s = setup(100);
    let not_admin = Address::generate(&s.env);
    s.token_b.mint(&not_admin, &1000);

    assert_eq!(
        s.pool.try_fund_rewards(&not_admin, &100),
        Err(Ok(Error::NotAdmin))
    );
    assert_eq!(
        s.pool.try_set_reward_rate(&not_admin, &999),
        Err(Ok(Error::NotAdmin))
    );
}

// ---------------------------------------------------------------------
// Reward math — the non-negotiable core
// ---------------------------------------------------------------------

#[test]
fn test_zero_total_staked_no_panic() {
    let s = setup(500);
    // Nobody has staked. Advancing time and reading `earned` must not
    // divide by zero, and the accumulator must not silently grow.
    advance(&s.env, 100_000);

    let random_user = Address::generate(&s.env);
    assert_eq!(s.pool.earned(&random_user), 0);

    let state = s.pool.get_pool_state();
    assert_eq!(state.reward_per_token_stored, 0);
    assert_eq!(state.total_staked, 0);
}

#[test]
fn test_single_staker_full_period() {
    let s = setup(500); // 500 units/sec
    let user = new_user(&s.env, &s.token_a, 100_000);

    s.pool.stake(&user, &100_000);
    advance(&s.env, 1000);

    // Sole staker owns 100% of the pool for the whole period.
    assert_eq!(s.pool.earned(&user), 500 * 1000);
}

#[test]
fn test_two_stakers_equal_split() {
    let s = setup(100);
    let a = new_user(&s.env, &s.token_a, 1000);
    let b = new_user(&s.env, &s.token_a, 1000);

    s.pool.stake(&a, &50);
    s.pool.stake(&b, &50);
    advance(&s.env, 100);

    let expected_total = 100 * 100; // reward_rate * seconds
    assert_eq!(s.pool.earned(&a), expected_total / 2);
    assert_eq!(s.pool.earned(&b), expected_total / 2);
}

#[test]
fn test_two_stakers_unequal_split() {
    let s = setup(300);
    let a = new_user(&s.env, &s.token_a, 1000);
    let b = new_user(&s.env, &s.token_a, 1000);

    s.pool.stake(&a, &200); // 2x
    s.pool.stake(&b, &100); // 1x
    advance(&s.env, 300);

    let expected_total = 300i128 * 300;
    // 2:1 split
    assert_eq!(s.pool.earned(&a), expected_total * 2 / 3);
    assert_eq!(s.pool.earned(&b), expected_total * 1 / 3);
}

#[test]
fn test_staggered_entry() {
    let s = setup(100);
    let a = new_user(&s.env, &s.token_a, 1000);
    let b = new_user(&s.env, &s.token_a, 1000);

    s.pool.stake(&a, &100);
    advance(&s.env, 100); // A alone earns for 100s @ rate 100 -> 10_000 to A

    s.pool.stake(&b, &100); // triggers checkpoint against OLD total_staked (100)
    advance(&s.env, 100); // now split 50/50 for another 100s -> 10_000 total, 5_000 each

    // A: 10_000 (solo period) + 5_000 (shared period) = 15_000
    assert_eq!(s.pool.earned(&a), 15_000);
    // B: 0 (wasn't staked yet) + 5_000 (shared period) = 5_000
    assert_eq!(s.pool.earned(&b), 5_000);
}

#[test]
fn test_claim_then_continue_staking() {
    let s = setup(200);
    let user = new_user(&s.env, &s.token_a, 1000);
    s.token_b.mint(&s.admin, &1_000_000);
    s.pool.fund_rewards(&s.admin, &1_000_000);

    s.pool.stake(&user, &100);
    advance(&s.env, 50);

    let claimed = s.pool.claim_reward(&user);
    assert_eq!(claimed, 200 * 50);
    assert_eq!(s.token_b.balance(&user), 200 * 50);
    assert_eq!(s.pool.earned(&user), 0); // fully reset

    // Continues accruing normally afterward on the same stake.
    advance(&s.env, 30);
    assert_eq!(s.pool.earned(&user), 200 * 30);

    let claimed_again = s.pool.claim_reward(&user);
    assert_eq!(claimed_again, 200 * 30);
    assert_eq!(s.token_b.balance(&user), 200 * 50 + 200 * 30);
}

#[test]
fn test_partial_unstake_then_continues_accruing() {
    let s = setup(100);
    let user = new_user(&s.env, &s.token_a, 1000);

    s.pool.stake(&user, &200);
    advance(&s.env, 100); // earns 100*100 = 10_000 on 200 staked

    s.pool.unstake(&user, &100); // now only 100 staked; pending 10_000 preserved
    assert_eq!(s.pool.earned(&user), 10_000);
    assert_eq!(s.pool.get_user_data(&user).staked_amount, 100);
    assert_eq!(s.token_a.balance(&user), 900); // 1000 - 200 + 100 returned

    advance(&s.env, 100); // solo staker again (100 staked) for another 100s @ rate100
    assert_eq!(s.pool.earned(&user), 10_000 + 100 * 100);
}

#[test]
fn test_claim_with_no_rewards_is_noop() {
    let s = setup(100);
    let user = new_user(&s.env, &s.token_a, 1000);
    s.pool.stake(&user, &100);
    // No time has passed, nothing accrued yet.
    let claimed = s.pool.claim_reward(&user);
    assert_eq!(claimed, 0);
    assert_eq!(s.token_b.balance(&user), 0);
}

#[test]
fn test_insufficient_reward_pool_blocks_claim() {
    let s = setup(1000);
    let user = new_user(&s.env, &s.token_a, 1000);
    // Fund far less than what will accrue.
    s.token_b.mint(&s.admin, &10);
    s.pool.fund_rewards(&s.admin, &10);

    s.pool.stake(&user, &100);
    advance(&s.env, 1000); // accrues 1000*1000 = 1_000_000, way more than funded

    assert_eq!(
        s.pool.try_claim_reward(&user),
        Err(Ok(Error::InsufficientRewardPool))
    );
    // Balance untouched since the transfer never happened.
    assert_eq!(s.token_b.balance(&user), 0);
}

#[test]
fn test_set_reward_rate_not_retroactive() {
    let s = setup(100);
    let user = new_user(&s.env, &s.token_a, 1000);
    s.pool.stake(&user, &100);

    advance(&s.env, 100); // 100s @ rate 100 -> 10_000
    s.pool.set_reward_rate(&s.admin, &500);
    advance(&s.env, 100); // 100s @ rate 500 -> 50_000

    assert_eq!(s.pool.earned(&user), 10_000 + 50_000);
    assert_eq!(s.pool.get_pool_state().reward_rate, 500);
}

// ---------------------------------------------------------------------
// Full lifecycle integration test
// ---------------------------------------------------------------------

#[test]
fn test_full_lifecycle_two_users() {
    // Stake amounts below are chosen so every accumulator division in this
    // scenario is exact (no dust from integer truncation), so expected
    // values can be checked for exact equality rather than a tolerance.
    let s = setup(1_000); // 1000 units/sec pool-wide
    s.token_b.mint(&s.admin, &10_000_000);
    s.pool.fund_rewards(&s.admin, &10_000_000);

    let alice = new_user(&s.env, &s.token_a, 10_000);
    let bob = new_user(&s.env, &s.token_a, 10_000);

    // Alice stakes 250 alone for 100s.
    s.pool.stake(&alice, &250);
    advance(&s.env, 100);
    // Alice owns 100% of a 250-token pool: earns 1000*100 = 100_000.

    // Bob joins with 750 (total now 1000).
    s.pool.stake(&bob, &750);
    advance(&s.env, 200);
    // Next 200s @ rate 1000 = 200_000 total, split 250:750 -> Alice 50_000, Bob 150_000.

    let expected_alice = 100_000 + 50_000;
    let expected_bob = 150_000;
    assert_eq!(s.pool.earned(&alice), expected_alice);
    assert_eq!(s.pool.earned(&bob), expected_bob);

    // Alice claims.
    let alice_claimed = s.pool.claim_reward(&alice);
    assert_eq!(alice_claimed, expected_alice);
    assert_eq!(s.token_b.balance(&alice), expected_alice);
    assert_eq!(s.pool.earned(&alice), 0);

    // Bob partially unstakes; pending rewards preserved, not paid out yet.
    s.pool.unstake(&bob, &250);
    assert_eq!(s.pool.earned(&bob), expected_bob);
    assert_eq!(s.token_a.balance(&bob), 10_000 - 750 + 250);

    // Another 300s: total_staked is now 250 (Alice) + 500 (Bob) = 750.
    advance(&s.env, 300);
    let period3_total = 1_000 * 300;
    let alice_share3 = period3_total * 250 / 750;
    let bob_share3 = period3_total * 500 / 750;

    assert_eq!(s.pool.earned(&alice), alice_share3);
    assert_eq!(s.pool.earned(&bob), expected_bob + bob_share3);

    let bob_claimed = s.pool.claim_reward(&bob);
    assert_eq!(bob_claimed, expected_bob + bob_share3);
    assert_eq!(s.token_b.balance(&bob), expected_bob + bob_share3);

    // Total ever paid out plus Alice's still-unclaimed balance exactly
    // matches total ever emitted (zero dust for these chosen amounts).
    let total_emitted = 1_000 * (100 + 200 + 300);
    let total_paid = alice_claimed + bob_claimed;
    assert_eq!(total_paid + s.pool.earned(&alice), total_emitted);
}
