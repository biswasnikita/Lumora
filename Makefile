.PHONY: build test deploy fmt fmt-check clean

# Runs the full unit test suite (native, not wasm) for both contracts.
test:
	cargo test --workspace

# Builds both contracts to wasm via the Stellar CLI (handles optimization
# and metadata). Requires the `wasm32v1-none` target -- NOT
# `wasm32-unknown-unknown`, which soroban-sdk 26.x explicitly rejects on
# Rust 1.82+ (see build.rs panic message).
build:
	stellar contract build

fmt:
	cargo fmt --all

fmt-check:
	cargo fmt --all -- --check

# Deploys token A, token B, and stake_pool to Testnet and wires them
# together. See scripts/deploy.sh for the full flow and required env vars.
deploy:
	bash scripts/deploy.sh

clean:
	cargo clean
