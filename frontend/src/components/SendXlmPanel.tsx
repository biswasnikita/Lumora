import { useState } from "react";
import { explorerTxUrl } from "../config";
import { sendXlmPayment, WalletError } from "../lib/xlm";

interface Props {
  address: string | null;
  xlmBalance: string | null;
  /** Called after a successful send so the parent can refresh balances. */
  onSent: () => void;
}

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "success"; hash: string }
  | { state: "error"; message: string; kind?: string };

export function SendXlmPanel({ address, xlmBalance, onSent }: Props) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const sending = status.state === "sending";

  async function handleSend() {
    if (!address) return;
    setStatus({ state: "sending" });
    try {
      const hash = await sendXlmPayment({ from: address, to: to.trim(), amount: amount.trim() });
      setStatus({ state: "success", hash });
      setTo("");
      setAmount("");
      onSent();
    } catch (e) {
      const kind = e instanceof WalletError ? e.kind : undefined;
      setStatus({ state: "error", message: (e as Error).message, kind });
    }
  }

  return (
    <section className="card">
      <h2>Send XLM</h2>

      {!address ? (
        <p className="muted">Connect your wallet to send XLM.</p>
      ) : (
        <>
          <dl className="stat-list">
            <div>
              <dt>Your XLM balance</dt>
              <dd>{xlmBalance === null ? "…" : `${formatXlm(xlmBalance)} XLM`}</dd>
            </div>
          </dl>

          <label className="field-label" htmlFor="xlm-to">Recipient address</label>
          <input
            id="xlm-to"
            type="text"
            placeholder="G…"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={sending}
            spellCheck={false}
          />

          <label className="field-label" htmlFor="xlm-amount">Amount (XLM)</label>
          <input
            id="xlm-amount"
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={sending}
          />

          <button
            className="send-btn"
            disabled={sending || !to.trim() || !amount.trim()}
            onClick={handleSend}
          >
            {sending ? "Sending…" : "Send XLM"}
          </button>

          {/* Transaction feedback */}
          {status.state === "success" && (
            <div className="tx-feedback tx-success">
              <strong>✓ Payment sent!</strong>
              <div className="tx-hash">
                Tx: <code>{shortHash(status.hash)}</code>
              </div>
              <a href={explorerTxUrl(status.hash)} target="_blank" rel="noopener noreferrer">
                View on stellar.expert ↗
              </a>
            </div>
          )}
          {status.state === "error" && (
            <div className="tx-feedback tx-error">
              <strong>✕ Payment failed</strong>
              <div>{status.message}</div>
              {status.kind === "account-unfunded" && (
                <a
                  href={`https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Fund this account with Friendbot ↗
                </a>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function formatXlm(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}
