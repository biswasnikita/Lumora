use crate::{Token, TokenClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn create_token<'a>(e: &Env, admin: &Address) -> TokenClient<'a> {
    let contract_id = e.register(Token, ());
    let client = TokenClient::new(e, &contract_id);
    client.initialize(
        admin,
        &7,
        &String::from_str(e, "Demo Token"),
        &String::from_str(e, "DEMO"),
    );
    client
}

#[test]
fn test_mint_and_transfer() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let user1 = Address::generate(&e);
    let user2 = Address::generate(&e);

    let client = create_token(&e, &admin);

    client.mint(&user1, &1000);
    assert_eq!(client.balance(&user1), 1000);

    client.transfer(&user1, &user2, &400);
    assert_eq!(client.balance(&user1), 600);
    assert_eq!(client.balance(&user2), 400);
}

#[test]
fn test_allowance_and_transfer_from() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let user1 = Address::generate(&e);
    let spender = Address::generate(&e);
    let user2 = Address::generate(&e);

    let client = create_token(&e, &admin);
    client.mint(&user1, &1000);

    client.approve(&user1, &spender, &300, &(e.ledger().sequence() + 1000));
    assert_eq!(client.allowance(&user1, &spender), 300);

    client.transfer_from(&spender, &user1, &user2, &200);
    assert_eq!(client.balance(&user1), 800);
    assert_eq!(client.balance(&user2), 200);
    assert_eq!(client.allowance(&user1, &spender), 100);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_transfer_insufficient_balance_panics() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let user1 = Address::generate(&e);
    let user2 = Address::generate(&e);

    let client = create_token(&e, &admin);
    client.mint(&user1, &100);
    client.transfer(&user1, &user2, &200);
}

#[test]
fn test_burn() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let user1 = Address::generate(&e);

    let client = create_token(&e, &admin);
    client.mint(&user1, &500);
    client.burn(&user1, &200);
    assert_eq!(client.balance(&user1), 300);
}
