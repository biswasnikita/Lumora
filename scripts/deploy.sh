#!/usr/bin/env bash
# Deploys Token A, Token B, and StakePool to Stellar Testnet, then wires them
# together (init + an initial fund_rewards top-up).
#
# Requires: stellar-cli (>=23), rustup target wasm32v1-none.
#
# Usage:
#   ./scripts/deploy.sh [identity-name] [reward-rate-per-sec]
#
# Writes the resulting addresses to scripts/deploy-output.json.

set -euo pipefail

NETWORK="testnet"
IDENTITY="${1:-stakepool-deployer}"
REWARD_RATE="${2:-1000}"
INITIAL_FUNDING="${3:-100000000}" # Token B minted to admin and deposited via fund_rewards

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Building contracts"
stellar contract build

TOKEN_WASM="target/wasm32v1-none/release/token.wasm"
POOL_WASM="target/wasm32v1-none/release/stake_pool.wasm"

echo "==> Ensuring identity '$IDENTITY' exists and is funded on $NETWORK"
if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  stellar keys generate "$IDENTITY" --network "$NETWORK" --fund
fi
ADMIN=$(stellar keys address "$IDENTITY")
echo "    admin: $ADMIN"

echo "==> Deploying Token A (stake asset)"
TOKEN_A_ID=$(stellar contract deploy \
  --wasm "$TOKEN_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "    token_a: $TOKEN_A_ID"

stellar contract invoke --id "$TOKEN_A_ID" --source "$IDENTITY" --network "$NETWORK" -- \
  initialize --admin "$ADMIN" --decimal 7 --name "Stake Token A" --symbol TKA

echo "==> Deploying Token B (reward asset)"
TOKEN_B_ID=$(stellar contract deploy \
  --wasm "$TOKEN_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "    token_b: $TOKEN_B_ID"

stellar contract invoke --id "$TOKEN_B_ID" --source "$IDENTITY" --network "$NETWORK" -- \
  initialize --admin "$ADMIN" --decimal 7 --name "Stake Reward Token B" --symbol TKB

echo "==> Deploying StakePool"
POOL_ID=$(stellar contract deploy \
  --wasm "$POOL_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "    stake_pool: $POOL_ID"

echo "==> Initializing StakePool (reward_rate=$REWARD_RATE units/sec)"
stellar contract invoke --id "$POOL_ID" --source "$IDENTITY" --network "$NETWORK" -- \
  init --admin "$ADMIN" --token_a "$TOKEN_A_ID" --token_b "$TOKEN_B_ID" --reward_rate "$REWARD_RATE"

echo "==> Minting $INITIAL_FUNDING Token B to admin and funding the reward pool"
stellar contract invoke --id "$TOKEN_B_ID" --source "$IDENTITY" --network "$NETWORK" -- \
  mint --to "$ADMIN" --amount "$INITIAL_FUNDING"

stellar contract invoke --id "$POOL_ID" --source "$IDENTITY" --network "$NETWORK" -- \
  fund_rewards --admin "$ADMIN" --amount "$INITIAL_FUNDING"

OUTPUT_FILE="$REPO_ROOT/scripts/deploy-output.json"
cat > "$OUTPUT_FILE" <<EOF
{
  "network": "$NETWORK",
  "admin": "$ADMIN",
  "token_a": "$TOKEN_A_ID",
  "token_b": "$TOKEN_B_ID",
  "stake_pool": "$POOL_ID",
  "reward_rate_per_sec": $REWARD_RATE
}
EOF

echo ""
echo "==> Deployed. Addresses written to scripts/deploy-output.json:"
cat "$OUTPUT_FILE"
