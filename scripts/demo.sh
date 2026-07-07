#!/usr/bin/env bash
# Demo: two wallets stake different amounts of Token A and watch rewards
# split proportionally over real testnet time. Run scripts/deploy.sh first.
#
# Usage: ./scripts/demo.sh

set -euo pipefail

NETWORK="testnet"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

OUTPUT_FILE="scripts/deploy-output.json"
if [ ! -f "$OUTPUT_FILE" ]; then
  echo "Missing $OUTPUT_FILE — run scripts/deploy.sh first." >&2
  exit 1
fi

TOKEN_A_ID=$(grep -o '"token_a": *"[^"]*"' "$OUTPUT_FILE" | sed 's/.*"\(C[A-Z0-9]*\)"/\1/')
POOL_ID=$(grep -o '"stake_pool": *"[^"]*"' "$OUTPUT_FILE" | sed 's/.*"\(C[A-Z0-9]*\)"/\1/')
ADMIN_IDENTITY="stakepool-deployer"

for name in demo-alice demo-bob; do
  if ! stellar keys address "$name" >/dev/null 2>&1; then
    stellar keys generate "$name" --network "$NETWORK" --fund
  fi
done
ALICE=$(stellar keys address demo-alice)
BOB=$(stellar keys address demo-bob)

echo "==> Minting Token A to demo wallets"
stellar contract invoke --id "$TOKEN_A_ID" --source "$ADMIN_IDENTITY" --network "$NETWORK" -- \
  mint --to "$ALICE" --amount 3000
stellar contract invoke --id "$TOKEN_A_ID" --source "$ADMIN_IDENTITY" --network "$NETWORK" -- \
  mint --to "$BOB" --amount 1000

echo "==> Alice stakes 3000 (3x), Bob stakes 1000 (1x)"
stellar contract invoke --id "$POOL_ID" --source demo-alice --network "$NETWORK" -- \
  stake --user "$ALICE" --amount 3000
stellar contract invoke --id "$POOL_ID" --source demo-bob --network "$NETWORK" -- \
  stake --user "$BOB" --amount 1000

echo "==> Waiting 60s for rewards to accrue..."
sleep 60

echo "==> Alice's earned (expect ~3x Bob's):"
stellar contract invoke --id "$POOL_ID" --source demo-alice --network "$NETWORK" -- \
  earned --user "$ALICE"

echo "==> Bob's earned:"
stellar contract invoke --id "$POOL_ID" --source demo-bob --network "$NETWORK" -- \
  earned --user "$BOB"

echo "==> Pool state:"
stellar contract invoke --id "$POOL_ID" --source "$ADMIN_IDENTITY" --network "$NETWORK" -- \
  get_pool_state
