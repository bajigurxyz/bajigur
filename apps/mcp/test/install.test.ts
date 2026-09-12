import { describe, expect, it } from "bun:test";
import { install } from "../src/install";

const guide = install("https://mcp.bajigur.xyz");

describe("the install guide", () => {
  it("never tells anyone to clone the repository", () => {
    // This is the guide an agent lands on when it opens the server's URL, and
    // it follows what it reads literally. A clone is a wrong turn it cannot
    // recover from: it ends up running a second copy of a server that is
    // already running, with none of the credentials, and blames us.
    expect(guide).not.toContain("git clone");
    expect(guide).not.toContain("github:");
    expect(guide).not.toContain("bun install");
  });

  it("leads with connecting, before anything about paying", () => {
    // Someone who just wants to look should reach a working command before
    // they reach the word wallet. Browsing needs no credential at all, and
    // burying that behind payment setup is what makes this look complicated.
    expect(guide.indexOf("claude mcp add")).toBeGreaterThan(-1);
    expect(guide.indexOf("claude mcp add")).toBeLessThan(guide.indexOf("CONNECT WITH A WALLET"));
  });

  it("takes the endpoint from the caller rather than writing one down", () => {
    // The deployment has moved hosts twice. A URL written into this file
    // survives the move and keeps pointing at somewhere we left.
    expect(guide).toContain("https://mcp.bajigur.xyz/mcp");
    expect(install("https://example.test")).toContain("https://example.test/mcp");
    expect(guide).not.toContain("railway.app");
  });
});
