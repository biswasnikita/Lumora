use crate::types::{DataKey, Error, PoolState, UserData};
use soroban_sdk::{Address, Env};

const DAY_IN_LEDGERS: u32 = 17280;
const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;
const USER_BUMP_AMOUNT: u32 = 90 * DAY_IN_LEDGERS;
const USER_LIFETIME_THRESHOLD: u32 = USER_BUMP_AMOUNT - DAY_IN_LEDGERS;

pub fn has_pool(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Pool)
}

pub fn get_pool(env: &Env) -> Result<PoolState, Error> {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
    env.storage()
        .instance()
        .get(&DataKey::Pool)
        .ok_or(Error::NotInitialized)
}

pub fn set_pool(env: &Env, pool: &PoolState) {
    env.storage().instance().set(&DataKey::Pool, pool);
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}

pub fn get_user(env: &Env, user: &Address) -> UserData {
    let key = DataKey::User(user.clone());
    if let Some(data) = env.storage().persistent().get::<_, UserData>(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, USER_LIFETIME_THRESHOLD, USER_BUMP_AMOUNT);
        data
    } else {
        UserData::default_for(env)
    }
}

pub fn set_user(env: &Env, user: &Address, data: &UserData) {
    let key = DataKey::User(user.clone());
    env.storage().persistent().set(&key, data);
    env.storage()
        .persistent()
        .extend_ttl(&key, USER_LIFETIME_THRESHOLD, USER_BUMP_AMOUNT);
}
