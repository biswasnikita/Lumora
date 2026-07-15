# Lumora — Stellar Wallet & Staking dApp (Frontend)

A React + Vite frontend for the Stellar **Testnet** that integrates the
[Freighter](https://www.freighter.app/) wallet, native XLM payments, and a
deployed Soroban staking contract.

## Features

### Level 1 — Wallet basics
- **Wallet setup** — Freighter on the Stellar **Testnet** (`Test SDF Network`).
- **Wallet connection** — connect (`requestAccess`) and disconnect flows in the header.
- **Balance handling** — fetches and displays the connected account's native **XLM balance** (Horizon), shown in the header and the Send panel.
- **Transaction flow** — send a native **XLM payment** on testnet with full feedback:
  success/failure state, the **transaction hash**, and a link to the block explorer.

### Level 2 — Contract + robustness
- **Deployed contract** — Soroban staking pool on testnet (see `../scripts/deploy-output.json`).
- **Contract calls from the frontend** — `stake`, `unstake`, `claim_reward`, plus read views.
- **Transaction status visible** — pending / success / error states surfaced in the UI.
- **Error handling** — the payment flow raises a typed `WalletError` with distinct kinds:
  1. `invalid-address` — recipient is not a valid `G…` key (or amount ≤ 0)
  2. `account-unfunded` — source account not funded on testnet (offers a Friendbot link)
  3. `insufficient-balance` — amount exceeds available balance (keeps ~1 XLM for reserve/fee)
  4. `declined` — user rejected signing in Freighter
  5. `submit-failed` — network/Horizon rejected the transaction
- **Mobile responsive** — single-column layout and wrapping header below 560px.

## Getting started

```bash
cd frontend
npm install
cp .env.example .env   # fill in contract IDs from ../scripts/deploy-output.json
npm run dev            # http://localhost:5173/app/
```

### Environment (`.env`)
| Var | Purpose |
| --- | --- |
| `VITE_NETWORK_PASSPHRASE` | Network passphrase (`Test SDF Network ; September 2015`) |
| `VITE_RPC_URL` | Soroban RPC endpoint |
| `VITE_TOKEN_A_ID` / `VITE_TOKEN_B_ID` | Staking token contract IDs |
| `VITE_STAKE_POOL_ID` | Staking pool contract ID |
| `VITE_HORIZON_URL` | *(optional)* Horizon endpoint — defaults to testnet Horizon |
| `VITE_EXPLORER_NETWORK` | *(optional)* explorer network segment — defaults to `testnet` |

## Testing the wallet + payment flow manually
1. Install Freighter, create/import an account, set network to **Testnet**.
2. Fund the account: <https://friendbot.stellar.org/?addr=YOUR_G_ADDRESS>.
3. Open the app, click **Connect Freighter**, approve.
4. Confirm your **XLM balance** shows in the header.
5. In **Send XLM**, enter a recipient `G…` and an amount, click **Send XLM**, approve in Freighter.
6. On success you'll see the **tx hash** and an explorer link; on failure, a typed error message.

## Project structure
```
src/
  lib/
    wallet.ts        Freighter adapter (connect/disconnect/sign)
    xlm.ts           native XLM balance + payment (typed errors)
    stellar-sdk.ts   shared RPC + Horizon servers
    contract.ts      generic Soroban contract-call helper
    contracts.ts     typed stake/unstake/claim/read bindings
  components/
    SendXlmPanel.tsx Send-XLM form + transaction feedback
    StakePanel.tsx   stake/unstake
    RewardsPanel.tsx claimable rewards
    PoolStats.tsx    pool overview
```
