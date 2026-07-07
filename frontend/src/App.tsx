import { useCallback, useEffect, useState } from "react";
import { config, POLL_INTERVAL_MS } from "./config";
import {
  claimReward,
  fetchEarned,
  fetchPoolState,
  fetchTokenBalance,
  fetchUserData,
  stake,
  unstake,
  type PoolState,
  type UserData,
} from "./lib/contracts";
import { connectWallet, getConnectedAddress, isFreighterAvailable } from "./lib/wallet";
import { PoolStats } from "./components/PoolStats";
import { StakePanel } from "./components/StakePanel";
import { RewardsPanel } from "./components/RewardsPanel";
import "./App.css";

export default function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [freighterAvailable, setFreighterAvailable] = useState(true);
  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [earned, setEarned] = useState<bigint | null>(null);
  const [tokenABalance, setTokenABalance] = useState<bigint | null>(null);
  const [tokenBBalance, setTokenBBalance] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshPoolState = useCallback(async () => {
    try {
      setPoolState(await fetchPoolState());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const refreshUserState = useCallback(async (addr: string) => {
    try {
      const [ud, earnedNow, balA, balB] = await Promise.all([
        fetchUserData(addr),
        fetchEarned(addr),
        fetchTokenBalance(config.tokenAId, addr),
        fetchTokenBalance(config.tokenBId, addr),
      ]);
      setUserData(ud);
      setEarned(earnedNow);
      setTokenABalance(balA);
      setTokenBBalance(balB);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Initial load + reconnect if the wallet already authorized this app.
  useEffect(() => {
    isFreighterAvailable().then(setFreighterAvailable);
    refreshPoolState();
    getConnectedAddress().then((addr) => {
      if (addr) setAddress(addr);
    });
  }, [refreshPoolState]);

  // Live-ticking poll: pool stats + this user's earned/balances.
  useEffect(() => {
    const id = setInterval(() => {
      refreshPoolState();
      if (address) refreshUserState(address);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [address, refreshPoolState, refreshUserState]);

  useEffect(() => {
    if (address) refreshUserState(address);
  }, [address, refreshUserState]);

  async function handleConnect() {
    setError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function withBusy(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await Promise.all([refreshPoolState(), address ? refreshUserState(address) : Promise.resolve()]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>StakePool</h1>
        {address ? (
          <span className="wallet-pill">{address.slice(0, 4)}…{address.slice(-4)}</span>
        ) : (
          <button onClick={handleConnect} disabled={!freighterAvailable}>
            {freighterAvailable ? "Connect Freighter" : "Freighter not detected"}
          </button>
        )}
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="app-grid">
        <PoolStats poolState={poolState} />
        <StakePanel
          address={address}
          userData={userData}
          tokenABalance={tokenABalance}
          busy={busy}
          onStake={(amount) => withBusy(() => stake(address!, amount))}
          onUnstake={(amount) => withBusy(() => unstake(address!, amount))}
        />
        <RewardsPanel
          address={address}
          earned={earned}
          tokenBBalance={tokenBBalance}
          busy={busy}
          onClaim={() => withBusy(async () => void (await claimReward(address!)))}
        />
      </main>
    </div>
  );
}
