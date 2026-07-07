export const TOKEN_DECIMALS = 7;

/** Converts a raw on-chain integer amount to a human-readable decimal string. */
export function toDisplay(raw: bigint, decimals: number = TOKEN_DECIMALS): string {
  const scale = 10n ** BigInt(decimals);
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const whole = abs / scale;
  const frac = abs % scale;
  const sign = negative ? "-" : "";
  if (frac === 0n) return `${sign}${whole}`;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${sign}${whole}.${fracStr}`;
}

/** Parses a human-entered decimal string into a raw on-chain integer amount. */
export function parseAmount(input: string, decimals: number = TOKEN_DECIMALS): bigint {
  const trimmed = input.trim();
  if (trimmed === "" || Number.isNaN(Number(trimmed))) {
    throw new Error("Invalid amount");
  }
  const [wholeStr, fracStr = ""] = trimmed.split(".");
  const whole = BigInt(wholeStr === "" ? "0" : wholeStr);
  const frac = (fracStr + "0".repeat(decimals)).slice(0, decimals);
  return whole * 10n ** BigInt(decimals) + BigInt(frac === "" ? "0" : frac);
}
