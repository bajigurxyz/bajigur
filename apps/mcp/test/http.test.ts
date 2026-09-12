import { describe, expect, it } from "bun:test";
import { handle } from "../src/http";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  handle(
    new Request("https://mcp.example/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );

const call = (name: string) => ({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: { name, arguments: { id: "hero-scroll-reveal" } },
});

describe("authorization challenge", () => {
  it("challenges an anonymous call to a paid tool", async () => {
    const response = await post(call("get_prompt"));

    // 401 is what makes an MCP client start OAuth. A 200 carrying an error
    // message leaves the user with no way to log in.
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(
      'Bearer resource_metadata="https://mcp.example/.well-known/oauth-protected-resource", error="unauthorized"',
    );
  });

  it("lets an anonymous client list the tools", async () => {
    const response = await post({ jsonrpc: "2.0", id: 1, method: "tools/list" });

    expect(response.status).toBe(200);
    const { result } = (await response.json()) as { result: { tools: { name: string }[] } };
    expect(result.tools.map((tool) => tool.name)).toContain("get_prompt");
  });

  it("names the authorization server in its metadata", async () => {
    const response = await handle(
      new Request("https://mcp.example/.well-known/oauth-protected-resource"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      resource: "https://mcp.example/mcp",
      authorization_servers: [expect.any(String)],
    });
  });
});
