#![no_std]

//! Minimal SEP-41 compatible fungible token contract.
//!
//! This is a self-contained token used to play the role of Token A (stake
//! asset) and Token B (reward asset) in the StakePool demo. It implements
//! the standard balance/transfer/allowance/mint/burn surface so StakePool
//! can interact with it exactly as it would any SEP-41 token, including the
//! Stellar Asset Contract on mainnet/testnet.

mod admin;
mod allowance;
mod balance;
mod events;
mod metadata;
mod storage_types;

use crate::admin::{has_administrator, read_administrator, write_administrator};
use crate::allowance::{read_allowance, spend_allowance, write_allowance};
use crate::balance::{read_balance, receive_balance, spend_balance};
use crate::events::{Approve, Burn, Mint, SetAdmin, Transfer};
use crate::metadata::{read_decimal, read_name, read_symbol, write_metadata};
use soroban_sdk::{contract, contractimpl, contractmeta, Address, Env, String};
use storage_types::TokenMetadata;

fn check_nonnegative_amount(amount: i128) {
    if amount < 0 {
        panic!("negative amount is not allowed");
    }
}

contractmeta!(key = "Description", val = "SEP-41 token for StakePool demo");

#[contract]
pub struct Token;

#[contractimpl]
impl Token {
    pub fn initialize(env: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if has_administrator(&env) {
            panic!("already initialized");
        }
        write_administrator(&env, &admin);
        if decimal > 18 {
            panic!("decimal must not be greater than 18");
        }
        write_metadata(
            &env,
            TokenMetadata {
                decimal,
                name,
                symbol,
            },
        );
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        check_nonnegative_amount(amount);
        let admin = read_administrator(&env);
        admin.require_auth();
        receive_balance(&env, to.clone(), amount);
        Mint { admin, to, amount }.publish(&env);
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        let admin = read_administrator(&env);
        admin.require_auth();
        write_administrator(&env, &new_admin);
        SetAdmin { admin, new_admin }.publish(&env);
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        read_allowance(&env, from, spender).amount
    }

    pub fn approve(
        env: Env,
        from: Address,
        spender: Address,
        amount: i128,
        expiration_ledger: u32,
    ) {
        from.require_auth();
        check_nonnegative_amount(amount);
        write_allowance(
            &env,
            from.clone(),
            spender.clone(),
            amount,
            expiration_ledger,
        );
        Approve {
            from,
            spender,
            amount,
            expiration_ledger,
        }
        .publish(&env);
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        read_balance(&env, id)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        check_nonnegative_amount(amount);
        spend_balance(&env, from.clone(), amount);
        receive_balance(&env, to.clone(), amount);
        Transfer { from, to, amount }.publish(&env);
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        check_nonnegative_amount(amount);
        spend_allowance(&env, from.clone(), spender, amount);
        spend_balance(&env, from.clone(), amount);
        receive_balance(&env, to.clone(), amount);
        Transfer { from, to, amount }.publish(&env);
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        check_nonnegative_amount(amount);
        spend_balance(&env, from.clone(), amount);
        Burn { from, amount }.publish(&env);
    }

    pub fn decimals(env: Env) -> u32 {
        read_decimal(&env)
    }

    pub fn name(env: Env) -> String {
        read_name(&env)
    }

    pub fn symbol(env: Env) -> String {
        read_symbol(&env)
    }
}

#[cfg(test)]
mod test;
