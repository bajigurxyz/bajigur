import { describe, expect, it } from "vitest";
import { transactionIdOf } from "../hedera";

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64");

describe("transactionIdOf", () => {
  it("reads the Hedera transaction id out of the PAYMENT-RESPONSE header", () => {
    const header = encode({ success: true, transaction: "0.0.9185802@1789055565.700887673" });
    expect(transactionIdOf(header)).toBe("0.0.9185802@1789055565.700887673");
  });

  it("is undefined when the header is absent", () => {
    expect(transactionIdOf(null)).toBeUndefined();
  });

  it("never throws on a header it cannot read — a paid request must not fail over it", () => {
    expect(transactionIdOf("not base64 json")).toBeUndefined();
    expect(transactionIdOf(encode({ success: true }))).toBeUndefined();
  });
});
