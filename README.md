# StakePool

A single Soroban smart contract where users stake **Token A** and earn **Token B**
continuously, in proportion to their share of the total staked pool. It's the
standard Synthetix-style "reward-per-token accumulator" pattern, implemented
in Rust for Stellar Soroban — scoped down to one clean, auditable contract.

## Why this pattern

The naive way to distribute rewards to N stakers is to loop over every staker
each time rewards are paid out. That's O(N) work per distribution and doesn't
scale — and on-chain, an unbounded loop over a user list is a liveness bug
waiting to happen (gas/resource limits, one broken account blocking everyone
else's payout).

Instead, `StakePool` tracks a single pool-wide number, `reward_per_token_stored`,
that increases over time in proportion to `reward_rate / total_staked`. Each
user's earned rewards are computed lazily — only when that user interacts with
the contract — as:

```
earned = rewards_owed + staked_amount * (reward_per_token_now - reward_per_token_at_last_checkpoint) / SCALE
```

Because `reward_per_token_now` already encodes "how much reward has accrued
per unit staked since the beginning of time," multiplying by the user's stake
and subtracting off what they'd already been credited for gives exactly their
share for the elapsed period — regardless of how many other stakers came and
went in the meantime. No loops, no per-user bookkeeping beyond one snapshot.
This makes every state-changing call O(1) regardless of how many stakers
exist.

The accumulator itself is projected forward with:

```
reward_per_token_now = reward_per_token_stored + (seconds_elapsed * reward_rate * SCALE) / total_staked
```

`SCALE` (`10^18`) is a fixed-point multiplier: without it, integer division
would round `reward_rate / total_staked` down to zero whenever the reward
rate is smaller than the pool size, silently losing all rewards. Scaling up
before dividing, then dividing back out in `earned`, keeps the precision.

Every state-changing function (`stake`, `unstake`, `claim_reward`,
`set_reward_rate`) calls a `checkpoint` step **first**, before any balance
changes — see [`contracts/stake_pool/src/math.rs`](contracts/stake_pool/src/math.rs).
This checkpoint updates the global accumulator (using the *old*
`total_staked`) and rolls the caller's pending rewards into `rewards_owed`
(using their *old* `staked_amount`) before the amounts change. Get this
ordering wrong and either the pool over/under-pays, or a user's accrual gets
computed against the wrong stake size for part of the period.

One deliberate edge case: if `total_staked` is ever zero, the accumulator
simply doesn't advance (`reward_per_token` returns the stored value
unchanged). Any reward that would have been emitted during a fully-empty
pool is not retroactively distributed to whoever stakes next — this is
standard behavior for this pattern, not a bug.

## Contract surface

| Function | Access | Description |
|---|---|---|
| `init(admin, token_a, token_b, reward_rate)` | admin, once | One-time setup |
| `fund_rewards(admin, amount)` | admin | Deposits Token B to be paid out over time |
| `stake(user, amount)` | user | Stakes Token A |
| `unstake(user, amount)` | user | Withdraws staked Token A; pending rewards preserved |
| `claim_reward(user) -> i128` | user | Pays out accrued Token B, returns amount paid (0 if none owed) |
| `earned(user) -> i128` | public, read-only | Currently claimable reward, projected to now |
| `get_pool_state() -> PoolState` | public, read-only | Pool-wide stats |
| `get_user_data(user) -> UserData` | public, read-only | Raw per-user staking record |
| `set_reward_rate(admin, new_rate)` | admin | Changes the pool-wide emission rate (not retroactive) |

Errors (`contracts/stake_pool/src/types.rs`): `AlreadyInitialized`,
`NotInitialized`, `NotAdmin`, `ZeroAmount`, `InsufficientStake`,
`InsufficientRewardPool`. Claiming with zero rewards owed is a no-op
(returns `0`) rather than an error.

## Repo layout

```
contracts/
  stake_pool/   the contract described above
  token/        a minimal SEP-41 fungible token, used as both Token A and Token B
                in tests/demos (any SEP-41-compliant token works in production,
                including the Stellar Asset Contract)
scripts/
  deploy.sh     deploys token A, token B, and stake_pool to testnet and wires them up
  demo.sh       two wallets stake different amounts and rewards visibly split proportionally
frontend/       React app: stake/unstake panel, live-ticking rewards display, pool stats
```

## Running the tests

```
cargo test --workspace
```

The test suite (`contracts/stake_pool/src/test.rs`) is the highest-priority
deliverable in this project and covers: single-staker full-period accrual,
equal and unequal multi-staker splits, staggered entry, claim-then-continue,
partial unstake, the zero-`total_staked` guard, admin/auth error paths, and a
full multi-user lifecycle integration test with independently-computed
expected values.

## Building the contracts

```
stellar contract build
```

Produces `target/wasm32v1-none/release/{stake_pool,token}.wasm`.

## Deploying to Testnet

```
./scripts/deploy.sh [identity-name] [reward-rate-per-sec]
```

Deploys Token A, Token B, and StakePool; initializes the pool; mints and
deposits an initial Token B reward balance. Writes contract IDs to
`scripts/deploy-output.json`.

Then, to see two wallets stake different amounts and watch rewards split
proportionally in real time:

```
./scripts/demo.sh
```

## Frontend

```
cd frontend
npm install
npm run dev
```

Requires the [Freighter](https://www.freighter.app/) wallet extension and the
contract addresses from `scripts/deploy-output.json` (see
`frontend/.env.example`).
