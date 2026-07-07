use soroban_sdk::{contractevent, Address};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Staked {
    #[topic]
    pub user: Address,
    pub amount: i128,
    pub total_staked: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Unstaked {
    #[topic]
    pub user: Address,
    pub amount: i128,
    pub total_staked: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardClaimed {
    #[topic]
    pub user: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardsFunded {
    pub amount: i128,
    pub funded_by: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardRateUpdated {
    pub old_rate: i128,
    pub new_rate: i128,
}
