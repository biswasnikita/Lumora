import { useState } from "react";
import type { UserData } from "../lib/contracts";
import { parseAmount, toDisplay } from "../lib/format";

interface Props {
  address: string | null;
  userData: UserData | null;
  tokenABalance: bigint | null;
  busy: boolean;
  onStake: (amount: bigint) => Promise<void>;
  onUnstake: (amount: bigint) => Promise<void>;
}

export function StakePanel({ address, userData, tokenABalance, busy, onStake, onUnstake }: Props) {
  const [amountInput, setAmountInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function parsedOrNull(): bigint | null {
    try {
      const amount = parseAmount(amountInput);
      if (amount <= 0n) throw new Error("Amount must be greater than zero");
      return amount;
    } catch {
      return null;
    }
  }

  async function handle(action: (amount: bigint) => Promise<void>, maxAllowed?: bigint) {
    setLocalError(null);
    const amount = parsedOrNull();
    if (amount === null) {
      setLocalError("Enter a valid amount");
      return;
    }
    if (maxAllowed !== undefined && amount > maxAllowed) {
      setLocalError("Amount exceeds available balance");
      return;
    }
    await action(amount);
    setAmountInput("");
  }

  const disabled = !address || busy;

  return (
    <section className="card">
      <h2>Stake / Unstake</h2>
      {!address ? (
        <p className="muted">Connect your wallet to stake.</p>
      ) : (
        <dl className="stat-list">
          <div>
            <dt>Your Token A balance</dt>
            <dd>{tokenABalance === null ? "…" : toDisplay(tokenABalance)}</dd>
          </div>
          <div>
            <dt>Your staked amount</dt>
            <dd>{userData === null ? "…" : toDisplay(userData.staked_amount)}</dd>
          </div>
        </dl>
      )}

      <input
        type="text"
        inputMode="decimal"
        placeholder="Amount"
        value={amountInput}
        onChange={(e) => setAmountInput(e.target.value)}
        disabled={disabled}
      />
      {localError && <p className="field-error">{localError}</p>}

      <div className="button-row">
        <button disabled={disabled} onClick={() => handle(onStake, tokenABalance ?? 0n)}>
          Stake
        </button>
        <button
          disabled={disabled}
          onClick={() => handle(onUnstake, userData?.staked_amount ?? 0n)}
          className="secondary"
        >
          Unstake
        </button>
      </div>
    </section>
  );
}
