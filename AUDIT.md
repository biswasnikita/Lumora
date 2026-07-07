# StakePool — Production Readiness Audit

**Date:** 2026-07-07
**Network:** Stellar Testnet
**Commit:** `e97f7ff` (local `master`, not yet pushed — see [CI/CD Audit](#cicd-audit))

> Scope note: this audit covers every claim with what was actually run and
> observed in this session. Anything not independently verified is called
> out explicitly in [Remaining Risks](#remaining-risks) rather than marked
> done.

---

## Executive Summary

StakePool is a Synthetix-style reward-per-token staking pool on Soroban:
stake Token A, earn Token B continuously in proportion to pool share. The
contract, its 19-test unit suite, and a Vite/React frontend are complete,
locally verified, and **deployed live to Testnet** with real, independently
confirmed transactions.

| Area | Status |
|---|---|
| Smart contract (stake_pool + token) | ✅ Complete, 19/19 tests passing, wasm builds clean |
| Live Testnet deployment | ✅ Deployed, on-chain math independently verified against wall-clock time |
| Frontend | ✅ Builds, lints (0 errors), and tests (11/11) clean; type-safe (no `any`) |
| CI workflow (`ci.yml`) | ✅ Written and locally validated step-by-step; ⚠️ not yet run on GitHub Actions (no remote pushed) |
| CD workflow (`deploy.yml`) | ✅ Written; ⚠️ cannot be run or verified without `STELLAR_SECRET_KEY` / `VERCEL_TOKEN` repo secrets, which this session has no way to obtain or set |
| Git / push to `main` | ✅ Committed locally; ❌ **not pushed** — no GitHub remote exists and no `gh auth` session is configured |

**Bottom line:** everything within local control is done and verified with
real evidence below. The two items outside local control — a GitHub
remote/auth to push to, and repo secrets for the CD job — are blockers only
you can clear (see [Remaining Risks](#remaining-risks)).

---

## Architecture Review

```
contracts/
  stake_pool/   reward-per-token accumulator contract (the product)
  token/        minimal SEP-41 token, used as both Token A and Token B
frontend/       Vite + React + TS, dynamic Soroban contract.Client (no codegen)
scripts/        deploy.sh (testnet deploy+wire-up), demo.sh (multi-staker demo)
.github/workflows/
  ci.yml        contracts job (test+build) / frontend job (lint+build+test)
  deploy.yml    deploy-contract job / deploy-frontend job (needs: deploy-contract)
```

The core design is documented in `README.md`: a single pool-wide
`reward_per_token_stored` accumulator advances over time
(`reward_rate * elapsed / total_staked`, scaled by `10^18`), and each user's
earned reward is computed lazily as
`staked_amount * (accumulator_now - accumulator_at_last_checkpoint)` — O(1)
per interaction regardless of staker count, with no unbounded loops.

The frontend does **not** use pre-generated TypeScript bindings; it calls
`@stellar/stellar-sdk/contract`'s `Client.from()`, which fetches the
contract's spec directly from the ledger at runtime. `lib/contract.ts`
wraps this in a single generic `callContractFunction<T>()` helper (added in
this pass) that both handles the Rust `Result<T, Error>` unwrapping and
distinguishes read-only simulation from sign-and-send, so `lib/contracts.ts`
is now a thin, duplication-free typed API over it.

---

## Smart Contract Audit

**Files:** `contracts/stake_pool/src/{lib,math,storage,types,events}.rs`, `contracts/token/src/*.rs`

- `math.rs` isolates the accumulator (`reward_per_token`, `earned`,
  `checkpoint`) as pure functions, independent of storage — this is what
  makes the reward math auditable in isolation.
- Every mutating entrypoint (`stake`, `unstake`, `claim_reward`,
  `set_reward_rate`) calls `checkpoint()` **before** changing
  `total_staked`/`staked_amount`, so accrual is always computed against the
  pre-change amounts. Verified in `test_staggered_entry` and confirmed live
  on-chain (see [Testing Report](#testing-report)).
- Zero-`total_staked` division-by-zero is explicitly guarded
  (`test_zero_total_staked_no_panic`).
- `claim_reward` on zero owed rewards is a no-op returning `0`, not an
  error (matches the spec's stated preference).
- Admin-gated functions (`fund_rewards`, `set_reward_rate`) check the
  passed `admin` address against `PoolState.admin` before `require_auth()`,
  rejecting spoofed-admin calls with `Error::NotAdmin`
  (`test_non_admin_cannot_fund_or_set_rate`).
- `Cargo.toml` release profile sets `overflow-checks = true` — arithmetic
  overflow traps instead of silently wrapping, appropriate for a contract
  handling token amounts.
- Events use the modern `#[contractevent]` macro (not the deprecated
  `env.events().publish` tuple form) for `Staked`, `Unstaked`,
  `RewardClaimed`, `RewardsFunded`, `RewardRateUpdated`.

**Known limitation, not a defect:** the CD workflow's `stellar contract
deploy` creates a **fresh** contract instance on every push to `main`
(matches the literal CD spec you provided), rather than `contract upgrade`
in place. Each deploy therefore produces new contract IDs — fine for a
hackathon demo flow, not how you'd want a real production release process
to work long-term.

---

## Frontend Audit

**Stack:** Vite 6 + React 18 + TypeScript 5, strict mode, `noUnusedLocals`/`noUnusedParameters` on.

- `lib/wallet.ts` — Freighter adapter (`signTransaction` bridged to the SDK's expected shape).
- `lib/stellar-sdk.ts` — exports `networkPassphrase` and a Soroban RPC `server` instance (added in this pass).
- `lib/contract.ts` — generic `callContractFunction<T>()` (added in this pass); zero `any` (verified — see Build/Test Outputs).
- `lib/contracts.ts` — typed `fetchPoolState`/`fetchEarned`/`fetchUserData`/`fetchTokenBalance`/`stake`/`unstake`/`claimReward`, all now built on `callContractFunction`.
- `lib/format.ts` — fixed-point display/parse helpers, now covered by 11 real unit tests (`format.test.ts`, added in this pass) exercising rounding, negative amounts, and round-tripping.
- Components (`PoolStats`, `StakePanel`, `RewardsPanel`) each call real contract functions, with loading/disabled states and try/catch error surfacing — this was verified in the prior session by exercising the exact `Client.from()` + `get_pool_state()`/`earned()` code path directly against the live deployed contract (see [Deployment Verification](#deployment-verification)).

**Deviation from the literal spec, documented:** the CI/CD instructions you
relayed used Next.js conventions (`NEXT_PUBLIC_CONTRACT_ID`, a single
`lib/contract.ts` calling one contract). This app is Vite, not Next.js, and
has **three** deployed contracts (token_a, token_b, stake_pool), not one.
Using `NEXT_PUBLIC_*` names here would silently do nothing — Vite only
injects `VITE_*`-prefixed vars into `import.meta.env`. The workflows below
use `VITE_TOKEN_A_ID` / `VITE_TOKEN_B_ID` / `VITE_STAKE_POOL_ID` /
`VITE_RPC_URL` / `VITE_NETWORK_PASSPHRASE` instead, matching what
`frontend/src/config.ts` actually reads.

---

## CI/CD Audit

**`ci.yml`** — two jobs, exactly as specified:
- `contracts`: checkout → install Rust + wasm target → `cargo fmt --check` → `cargo test --workspace` → `cargo build --release`.
- `frontend`: checkout → Node 20 (`npm ci` cached) → `npm ci` → `npm run lint` → `npm run build` → `npm run test:ci`, `working-directory: frontend`.

**Documented deviation:** the target is `wasm32v1-none`, not
`wasm32-unknown-unknown` as literally requested. This was tested directly,
not assumed — `cargo build --target wasm32-unknown-unknown --release`
against `soroban-sdk 26.1.0` fails immediately with the SDK's own build
script panicking:

```
Rust compiler 1.82+ with target 'wasm32-unknown-unknown' is unsupported by
the Soroban Environment, use 'wasm32v1-none' available with Rust 1.84+.
```

Using the literally-requested target would make the `contracts` CI job
fail on every single run. `wasm32v1-none` is what our actual, working
Testnet deployment already builds with.

**`deploy.yml`** — two jobs, exactly as specified:
- `deploy-contract`: installs the Stellar CLI (`cargo install --locked stellar-cli --features opt`, cached by binary), builds via `stellar contract build`, deploys Token A, Token B, and StakePool fresh, initializes and funds the pool, and exposes the three resulting contract IDs as job outputs.
- `deploy-frontend`: `needs: [deploy-contract]`, builds the frontend with the three contract IDs injected as `VITE_*` env vars, then deploys via `npx vercel --prod --token ... --yes` (no deploy platform was already configured in this repo, so this defaults to Vercel exactly as your spec instructed).

**⚠️ Neither workflow has actually run on GitHub Actions.** This repo has
no remote and `gh auth status` reports no logged-in host — there is
nothing to push to, and I have no way to create or authenticate a GitHub
session (that requires an interactive OAuth flow). Even once pushed,
`deploy-contract` will fail without a `STELLAR_SECRET_KEY` repo secret
(a funded Testnet account's `S...` key) and `deploy-frontend` will fail
without a `VERCEL_TOKEN` — both are credentials I cannot obtain or
fabricate, and you should not paste them into chat; they need to be added
directly under the repo's Settings → Secrets → Actions.

What **is** verified: every step each job runs was executed locally in
this session with the exact same commands (see
[Build Outputs](#build-outputs) / [Test Outputs](#test-outputs)), so the
workflows are exercising known-good commands, not untested guesses.

---

## Testing Report

**Rust — `cargo test --workspace`: 19/19 passing (0 failed)**
- `stake_pool`: 15 tests — zero-amount rejection, insufficient-stake/insufficient-reward-pool errors, non-admin rejection, double-init rejection, single-staker full-period accrual, equal/unequal multi-staker splits, staggered entry, claim-then-continue, partial unstake, zero-`total_staked` guard, `set_reward_rate` non-retroactivity, and a full multi-user lifecycle integration test with independently-computed expected values.
- `token`: 4 tests — mint/transfer, allowance/transfer_from, insufficient-balance panic, burn.

**Frontend — `npx vitest run`: 11/11 passing (0 failed)**
- `format.test.ts`: whole/fractional display formatting, trailing-zero trimming, full-precision preservation, zero, negative amounts, parse round-tripping, truncation beyond configured decimals, invalid-input rejection.

**Live Testnet verification (real elapsed wall-clock time, not simulated):**
- Staked 500 (sole staker) at ledger close `2026-07-07T05:09:18Z`. Read `earned()` twice at real intervals:
  - ~67s later: `earned = 67000` = `1000 × 67` exactly.
  - ~4914s later: `earned = 4,914,000` = `1000 × 4914` exactly; the implied timestamp (`1783400958 + 4914`) converts back to `2026-07-07T06:31:12Z`, matching the wall-clock check to within one second.
  - Both `earned()` calls left `get_pool_state()`'s `last_update_time`/`reward_per_token_stored` unchanged, confirming the read-only projection doesn't perturb stored state.
- Multi-staker demo: Alice staked 3000, Bob staked 1000 (3:1 ratio) into a pool that already held 500 from the prior test. After 60s, Alice's `earned() = 45,619` vs Bob's `14,000` (~3.26:1) — above the raw 3:1 ratio because Alice's stake transaction landed a few seconds before Bob's, so she briefly accrued alone against a smaller pool. This is the same staggered-entry behavior `test_staggered_entry` exercises, now confirmed on live infrastructure rather than only in the test harness.

---

## Deployment Verification

**Network:** Stellar Testnet
**Admin:** `GD66QTNF5E7DY5YXZPZKBGDITHORBROCIPWDY24E6UDBWIHXWZAPFIG4`
**Reward rate:** 1000 units/sec (Token B), funded with 100,000,000 units

### Contract Deployment Addresses

| Contract | Address |
|---|---|
| Token A (stake asset) | `CBZES6BQ5QVCMEZEHQMEMRDWMI3EAQ55Y3OU46DOJBSFERYSVRQHYI6K` |
| Token B (reward asset) | `CCB3L3H4Z77PBNF7AEBER74PZ3TSJWNJ3U7F5JKE63GSDHRR6HMG6QDY` |
| StakePool | `CDUU2DFCM2ZA3AC5KAIL5CTNJ5IFZBE5DKC3DKLN3NMPAMOBIIPOWOEO` |

### Transaction Hashes

All confirmed successful on Testnet (two spot-checked directly against
Horizon in this session — see note below).

| Tx | Hash |
|---|---|
| Token A — install | `69760ad53dce23e41f71eb40980e67ca9e6643dec082e4427c01da747e9a720e` |
| Token A — deploy | `6adad8b45461553450ca8b86fd38cc54a0cda3daf986cf8c5bba5818d16017fe` |
| Token A — initialize | `269f75c2773d616147d1d139418f0574246c0029ff088b3b96e408989114492d` |
| Token B — deploy | `bee81948ffa0d72d44dd2f3f037a3998db9eebf98d14d60aa0b711d68324541b` |
| Token B — initialize | `c2dddd71897d17122dd74f34c104db24f29fd6f75995aa2e9e2d4da9a317884b` |
| StakePool — install | `7fe51bcdfc6a6a155f3ed74d2b932f24155511ec9db39644d7f8964d92711ff3` |
| StakePool — deploy | `738c20771871950d39b0e9e5024bedca084c2db33afac63d300765b1acbb616c` |
| StakePool — init | `4e38b2be00445c8f362da907b30e7e3dfd33950295fdf72f0074648a9fccacdf` |
| Token B — mint to admin | `5dfacfd244163c38e18769a389f3674ca9159998622760277729725f52617f3c` |
| StakePool — fund_rewards | `c95ffa6dfbbeba0a97ab000971cca57ccfdc8240f2083dfb045e033272fea904` |
| Token A — mint to verify-alice | `01ed09f3367327abe87fb70167c5438ab374f63921207dc710fca4cca471f095` |
| StakePool — verify-alice stake(500) | `50fd8e7c8ec1e3001305968fec8d7022291e2eaac5e2eaa3f0278aeed3b4c70f` |
| Token A — mint to demo-alice | `0cd0e5ec87556a1f5365f40af6cafbe8feb2a9d12c2e328a5c1decce9d864009` |
| Token A — mint to demo-bob | `6eead1689e8a1d73dbb3138932a961edcefc927e4d0f8d87e4c7e342efb59dea` |
| StakePool — demo-alice stake(3000) | `1647502edd8ed12aee4e51f88c164bcac50ef31cd12cbf09fe548f8f42e120d3` |
| StakePool — demo-bob stake(1000) | `533343120fe6d1c844f739de91f95cf0481b4f3d79d16e9f952519d478efcf1d` |

Explorer links: `https://stellar.expert/explorer/testnet/tx/<hash>`

*Independent verification note:* the StakePool deploy tx and the
verify-alice stake tx were re-fetched directly from
`horizon-testnet.stellar.org/transactions/<hash>` in this session (not just
read from CLI output) and both returned `successful: true`, at ledgers
3477078 and 3477090, with `created_at` timestamps (`05:08:18Z`, `05:09:18Z`)
matching the CLI output and the manual reward-math verification above
exactly.

---

## Build Outputs

```
$ stellar contract build
Wasm File: target\wasm32v1-none\release\stake_pool.wasm (14284 bytes)
Wasm Hash: 1ffbf043051e0e746149c1bb3c0beec9e226078b12c84500c5b0c754236a2a01
Exported Functions: claim_reward, earned, fund_rewards, get_pool_state,
                     get_user_data, init, set_reward_rate, stake, unstake
✅ Build Complete

Wasm File: target\wasm32v1-none\release\token.wasm (7718 bytes)
Wasm Hash: b5b2dad4ec1350c36288196959c7b93aa96103e51b015010b6fd83324aa27ba4
Exported Functions: allowance, approve, balance, burn, decimals, initialize,
                     mint, name, set_admin, symbol, transfer, transfer_from
✅ Build Complete
```

```
$ npm run build   (frontend/)
tsc -b && vite build
✓ 169 modules transformed.
dist/index.html                  0.39 kB │ gzip:   0.26 kB
dist/assets/index-*.css          2.60 kB │ gzip:   1.03 kB
dist/assets/index-*.js         508.91 kB │ gzip: 141.45 kB
✓ built in ~2s
```
(The chunk-size warning is cosmetic — from bundling `@stellar/stellar-sdk` — not a build failure.)

## Test Outputs

```
$ cargo test --workspace
running 15 tests (stake_pool) ... test result: ok. 15 passed; 0 failed
running 4 tests (token)       ... test result: ok. 4 passed; 0 failed

$ cargo fmt --all -- --check
(no output — clean)
```

```
$ npm run lint    (frontend/)
(no output — 0 errors, 0 warnings)

$ npm run test:ci    (frontend/)
✓ src/lib/format.test.ts (11 tests)
Test Files  1 passed (1)
Tests       11 passed (11)
```

---

## Documentation Review

- `README.md` — explains the reward-per-token pattern with derivations, full contract surface table, error list, repo layout, and exact commands to test/build/deploy.
- `Makefile` — `build`/`test`/`fmt`/`fmt-check`/`deploy`/`clean` targets, added in this pass (not independently tested — `make` is not installed on this Windows dev machine — but each target is a one-line passthrough to a command already verified directly above).
- `scripts/deploy.sh` / `scripts/demo.sh` — both executed for real against Testnet this session (not just written); outputs captured above.
- This document (`AUDIT.md`) — new in this pass.

**Gap:** no `CONTRIBUTING.md` or license file. Not requested in your spec; flagging only because a hackathon reviewer sometimes checks for one.

---

## Production Readiness Assessment

**Ready:**
- Contract logic, tests, and live Testnet deployment.
- Frontend build, lint, and unit tests.
- CI/CD workflow definitions, written against real, locally-verified commands.

**Not ready / explicitly out of scope for this pass:**
- No GitHub remote exists yet — nothing has actually run through GitHub Actions.
- CD's `deploy-contract` redeploys fresh contracts every push (no upgrade-in-place path) — fine for a demo, not a real release process.
- Frontend bundle is a single 509 kB chunk (gzip 141 kB) — code-splitting was flagged by Vite but not addressed, since it wasn't in scope of what was asked.
- No end-to-end browser test of the wallet-signing flow (Connect → Stake → Claim) exists — Playwright/`chromium-cli` aren't installed in this environment; the underlying RPC/contract-call code was verified directly instead (see prior session).

---

## Remaining Risks

1. **No git remote / GitHub auth.** `git push` has nowhere to go. Options: give me an existing repo URL to add as `origin`, or run `gh auth login` yourself (interactive OAuth, can't be done on your behalf) and I'll create/push from there.
2. **CD secrets don't exist.** `STELLAR_SECRET_KEY` (a funded Testnet account) and `VERCEL_TOKEN` must be added under the repo's Settings → Secrets → Actions before `deploy.yml` can succeed. I have no way to generate or supply either safely.
3. **Fresh-deploy-per-push in CD** means every merge to `main` mints new contract IDs; the frontend env vars are wired to whatever `deploy-contract` just produced, so the two jobs stay consistent with each other, but any external references to a specific contract ID (e.g. this document's addresses) go stale after the next CD run.
4. **Vercel zero-config first deploy is unverified.** Without a linked project (`vercel.json`, org/project ID), the first `vercel --prod --yes` run may prompt or need re-running — untestable without a real token.
5. **No automated browser test of the signed-transaction flow.** Everything up to wallet-signing was verified directly (RPC calls, contract state, math); the actual "click Connect in Freighter and sign" step has only been exercised via CLI-equivalent calls, not a real browser + extension.
