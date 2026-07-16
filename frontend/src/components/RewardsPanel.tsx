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
    <section className="card card--hero rewards-hero">
      <div className="rewards-hero-main">
        <span className="rewards-eyebrow">Claimable Rewards</span>
        {!address ? (
          <>
            <span className="earned-value earned-value--idle">—</span>
            <p className="muted">Connect your wallet to start earning Token B every second.</p>
          </>
        ) : (
          <>
            <span className="earned-value">{earned === null ? "…" : toDisplay(earned)}</span>
            <span className="earned-label">Token B accruing in real time</span>
          </>
        )}
      </div>

      {address && (
        <div className="rewards-hero-side">
          <div className="mini-stat">
            <span className="mini-stat-label">Wallet Token B</span>
            <span className="mini-stat-value">
              {tokenBBalance === null ? "…" : toDisplay(tokenBBalance)}
            </span>
          </div>
          <button disabled={busy || !hasRewards} onClick={onClaim} className="claim-btn">
            {hasRewards ? "Claim Rewards" : "Nothing to Claim"}
          </button>
        </div>
      )}
    </section>
  );
}
