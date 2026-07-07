import { describe, expect, it } from "vitest";
import { parseAmount, toDisplay } from "./format";

describe("toDisplay", () => {
  it("formats a whole number with no fractional part", () => {
    expect(toDisplay(5_0000000n)).toBe("5");
  });

  it("formats a fractional amount, trimming trailing zeros", () => {
    expect(toDisplay(12_5000000n)).toBe("12.5");
    expect(toDisplay(1_2345000n)).toBe("1.2345");
  });

  it("preserves full precision at the configured decimals", () => {
    expect(toDisplay(1_2345678n)).toBe("1.2345678");
  });

  it("handles zero", () => {
    expect(toDisplay(0n)).toBe("0");
  });

  it("handles negative amounts", () => {
    expect(toDisplay(-5_5000000n)).toBe("-5.5");
  });
});

describe("parseAmount", () => {
  it("parses a whole number", () => {
    expect(parseAmount("5")).toBe(5_0000000n);
  });

  it("parses a decimal amount", () => {
    expect(parseAmount("12.5")).toBe(12_5000000n);
  });

  it("pads short fractional input to full precision", () => {
    expect(parseAmount("1.23")).toBe(1_2300000n);
  });

  it("truncates fractional input beyond configured decimals", () => {
    expect(parseAmount("1.123456789")).toBe(1_1234567n);
  });

  it("round-trips through toDisplay", () => {
    const raw = parseAmount("42.42");
    expect(toDisplay(raw)).toBe("42.42");
  });

  it("throws on invalid input", () => {
    expect(() => parseAmount("")).toThrow();
    expect(() => parseAmount("abc")).toThrow();
  });
});
