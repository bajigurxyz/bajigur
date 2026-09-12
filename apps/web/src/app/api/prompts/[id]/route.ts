import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE } from "@/lib/agent";
import { API_BASE } from "@/lib/api";

/**
 * Unpublishes a prompt.
 *
 * Only the catalogue entry goes. The onchain registration and every licence
 * already sold stay exactly where they are, so a buyer never loses what they
 * paid for because a creator changed their mind.
 */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/prompts/[id]">) {
  const { id } = await ctx.params;
  const token = (await cookies()).get(AGENT_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Set up payments before unpublishing." }, { status: 401 });
  }

  const res = await fetch(`${API_BASE}/prompts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
