import { toDisplay } from "../lib/format";

interface Props {
  address: string | null;
  earned: bigint | null;
  tokenBBalance: bigint | null;
  busy: boolean;
  onClaim: () => Promise<void>;
}

export function RewardsPanel({ address, earned, tokenBBalance, busy, onClaim }: Props) {
  const hasRewards = (earned ?? 0n) > 0n;

  return (
    <section className="card">
      <h2>Rewards</h2>
      {!address ? (
        <p className="muted">Connect your wallet to see your rewards.</p>
      ) : (
        <>
          <div className="earned-display">
            <span className="earned-value">{earned === null ? "…" : toDisplay(earned)}</span>
            <span className="earned-label">Token B claimable</span>
          </div>
          <dl className="stat-list">
            <div>
              <dt>Your Token B balance</dt>
              <dd>{tokenBBalance === null ? "…" : toDisplay(tokenBBalance)}</dd>
            </div>
          </dl>
          <button disabled={busy || !hasRewards} onClick={onClaim}>
            Claim Rewards
          </button>
        </>
      )}
    </section>
  );
}
