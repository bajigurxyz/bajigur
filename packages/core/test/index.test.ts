import { describe, expect, it } from "bun:test";
import { APP_NAME, isAddress } from "../src/index";

describe("core", () => {
  it("exposes the app name", () => {
    expect(APP_NAME).toBe("bajigur");
  });

  it("accepts a valid EVM address", () => {
    expect(isAddress("0x0000000000000000000000000000000000000000")).toBe(true);
  });

  it("rejects anything that is not an address", () => {
    expect(isAddress("0xdeadbeef")).toBe(false);
    expect(isAddress("not-an-address")).toBe(false);
  });
});
