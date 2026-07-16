import { SECONDS_PER_YEAR } from "../config";
import type { PoolState } from "../lib/contracts";
import { toDisplay } from "../lib/format";

export function PoolStats({ poolState }: { poolState: PoolState | null }) {
  const apr =
    poolState && poolState.total_staked > 0n
      ? (Number(poolState.reward_rate) * SECONDS_PER_YEAR * 100) / Number(poolState.total_staked)
      : null;

  const tiles = [
    { label: "Total Staked", value: poolState ? toDisplay(poolState.total_staked) : "…", unit: "Token A" },
    { label: "Reward Rate", value: poolState ? toDisplay(poolState.reward_rate) : "…", unit: "Token B / sec" },
    { label: "Estimated APR", value: apr === null ? "—" : `~${apr.toFixed(1)}%`, unit: "variable" },
  ];

  return (
    <section className="stat-strip" aria-label="Pool overview">
      {tiles.map((t) => (
        <div className="strip-tile" key={t.label}>
          <span className="strip-value">{t.value}</span>
          <span className="strip-label">{t.label}</span>
          <span className="strip-unit">{t.unit}</span>
        </div>
      ))}
    </section>
  );
}
