import { SECONDS_PER_YEAR } from "../config";
import type { PoolState } from "../lib/contracts";
import { toDisplay } from "../lib/format";

export function PoolStats({ poolState }: { poolState: PoolState | null }) {
  const apr =
    poolState && poolState.total_staked > 0n
      ? (Number(poolState.reward_rate) * SECONDS_PER_YEAR * 100) / Number(poolState.total_staked)
      : null;

  return (
    <section className="card">
      <h2>Pool Stats</h2>
      {!poolState ? (
        <p className="muted">Loading…</p>
      ) : (
        <dl className="stat-list">
          <div>
            <dt>Total Staked (Token A)</dt>
            <dd>{toDisplay(poolState.total_staked)}</dd>
          </div>
          <div>
            <dt>Reward Rate (Token B / sec)</dt>
            <dd>{toDisplay(poolState.reward_rate)}</dd>
          </div>
          <div>
            <dt>Estimated APR</dt>
            <dd>{apr === null ? "—" : `~${apr.toFixed(1)}%`}</dd>
          </div>
        </dl>
      )}
      {poolState && (
        <p className="hint">
          APR is a rough estimate (reward_rate × seconds/year ÷ total staked) — it moves as the
          pool's total staked amount changes.
        </p>
      )}
    </section>
  );
}
