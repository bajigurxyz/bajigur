import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import McpDocsPage from "./page";

afterEach(cleanup);

/** The tools the deployed server actually answers `tools/list` with. */
const LIVE_TOOLS = ["search_prompts", "get_prompt", "my_licenses"];

describe("the MCP docs page", () => {
  it("documents the tools the server really has, and no others", () => {
    render(<McpDocsPage />);

    const rows = screen.getAllByRole("row").slice(1);
    const names = rows.map((row) => row.querySelector("code")?.textContent);
    expect(names).toEqual(LIVE_TOOLS);
  });

  it("takes every address from configuration, never from a hardcoded host", () => {
    const { container } = render(<McpDocsPage />);
    const text = container.innerHTML;

    // The deployment has moved hosts twice. Anything written into the page by
    // hand survives that move and quietly points at somewhere we left, which is
    // exactly how the landing page ended up advertising a Railway hostname
    // after the domain was live.
    const expected = `${(process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3004").replace(/\/+$/, "")}/mcp`;
    expect(text).toContain(expected);
    expect(text).not.toContain("railway.app");
    expect(text).not.toContain("vercel.app");
  });

  it("leads with the command that needs nothing else", () => {
    render(<McpDocsPage />);

    // The argument of the whole page is that connecting is one line, so the
    // one line has to be above everything that explains it.
    const code = screen.getAllByText(/claude mcp add/)[0];
    expect(code.textContent).toContain("--transport http bajigur");
    expect(code.textContent).not.toContain("Authorization");
  });

  it("says plainly that browsing costs nothing", () => {
    const { container } = render(<McpDocsPage />);
    expect(container.textContent).toContain("only buying is refused");
  });
});
