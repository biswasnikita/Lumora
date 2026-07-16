import { useCallback, useEffect, useState } from "react";
import { config, LANDING_PAGE_URL, POLL_INTERVAL_MS } from "./config";
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
import { fetchXlmBalance } from "./lib/xlm";
import { PoolStats } from "./components/PoolStats";
import { StakePanel } from "./components/StakePanel";
import { RewardsPanel } from "./components/RewardsPanel";
import { SendXlmPanel } from "./components/SendXlmPanel";
import "./App.css";

export default function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [freighterAvailable, setFreighterAvailable] = useState(true);
  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [earned, setEarned] = useState<bigint | null>(null);
  const [tokenABalance, setTokenABalance] = useState<bigint | null>(null);
  const [tokenBBalance, setTokenBBalance] = useState<bigint | null>(null);
  const [xlmBalance, setXlmBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshXlmBalance = useCallback(async (addr: string) => {
    try {
      setXlmBalance(await fetchXlmBalance(addr));
    } catch {
      // Balance fetch failures are non-fatal; leave the last known value.
    }
  }, []);

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
      if (address) {
        refreshUserState(address);
        refreshXlmBalance(address);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [address, refreshPoolState, refreshUserState, refreshXlmBalance]);

  useEffect(() => {
    if (address) {
      refreshUserState(address);
      refreshXlmBalance(address);
    }
  }, [address, refreshUserState, refreshXlmBalance]);

  async function handleConnect() {
    setError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleDisconnect() {
    setAddress(null);
    setUserData(null);
    setEarned(null);
    setTokenABalance(null);
    setTokenBBalance(null);
    setXlmBalance(null);
    setError(null);
  }

  async function withBusy(fn: (addr: string) => Promise<void>) {
    setError(null);
    // Resolve the wallet address live from Freighter at submit time rather than
    // trusting React state, which can be null/stale (e.g. authorized in the
    // extension but never captured by the app). This is the address used both as
    // the tx source (publicKey) and as the `user` contract argument, so it must
    // be a real key or the SDK throws "constructed using a default account".
    let addr = address;
    if (!addr) {
      addr = await getConnectedAddress();
    }
    if (!addr) {
      // Surface the real Freighter error (not installed / declined / locked /
      // wrong network) instead of a generic message, so failures are diagnosable.
      try {
        addr = await connectWallet();
      } catch (e) {
        setError(`Wallet not connected: ${(e as Error).message}`);
        return;
      }
    }
    if (!addr) {
      setError("Connect your Freighter wallet first.");
      return;
    }
    if (addr !== address) setAddress(addr);
    setBusy(true);
    try {
      await fn(addr);
      await Promise.all([refreshPoolState(), refreshUserState(addr)]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <a href={LANDING_PAGE_URL} className="brand-link">
          <span className="brand-mark" aria-hidden="true">N</span>
          <h1>Novaris</h1>
        </a>
        {address ? (
          <div className="wallet-connected">
            {xlmBalance !== null && (
              <span className="xlm-balance">
                {Number(xlmBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM
              </span>
            )}
            <span className="wallet-pill">{address.slice(0, 4)}…{address.slice(-4)}</span>
            <button className="secondary disconnect-btn" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        ) : freighterAvailable ? (
          <button className="connect-btn" onClick={handleConnect}>
            Connect Freighter
          </button>
        ) : (
          <a
            href="https://www.freighter.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="install-link"
          >
            Install Freighter
          </a>
        )}
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="dash">
        <div className="dash-intro">
          <h2 className="dash-title">Stake XLM assets. Earn every second.</h2>
          <p className="dash-sub">
            A transparent, fully-onchain staking dashboard. Deposit Token A, watch your Token B
            rewards accrue live, and withdraw whenever you like.
          </p>
        </div>

        <PoolStats poolState={poolState} />

        <RewardsPanel
          address={address}
          earned={earned}
          tokenBBalance={tokenBBalance}
          busy={busy}
          onClaim={() => withBusy(async (addr) => void (await claimReward(addr)))}
        />

        <div className="dash-cols">
          <StakePanel
            address={address}
            userData={userData}
            tokenABalance={tokenABalance}
            busy={busy}
            onStake={(amount) => withBusy((addr) => stake(addr, amount))}
            onUnstake={(amount) => withBusy((addr) => unstake(addr, amount))}
          />
          <SendXlmPanel
            address={address}
            xlmBalance={xlmBalance}
            onSent={() => address && refreshXlmBalance(address)}
          />
        </div>
      </main>
    </div>
  );
}
