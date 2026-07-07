use crate::storage_types::TokenMetadata;
use soroban_sdk::{symbol_short, Env, String};

pub fn read_decimal(e: &Env) -> u32 {
    read_metadata(e).decimal
}

pub fn read_name(e: &Env) -> String {
    read_metadata(e).name
}

pub fn read_symbol(e: &Env) -> String {
    read_metadata(e).symbol
}

pub fn write_metadata(e: &Env, metadata: TokenMetadata) {
    e.storage()
        .instance()
        .set(&symbol_short!("METADATA"), &metadata);
}

fn read_metadata(e: &Env) -> TokenMetadata {
    e.storage()
        .instance()
        .get(&symbol_short!("METADATA"))
        .unwrap()
}
