import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE } from "@/lib/agent";
import { API_BASE } from "@/lib/api";

/**
 * Who holds a licence for one prompt, for its creator only.
 *
 * The API reads the ERC-1155 `LicenseIssued` log, so this cannot disagree with
 * who can actually open the prompt: the balance is what grants access, and the
 * log is how that balance came to be.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/prompts/[id]/buyers">) {
  const { id } = await ctx.params;
  const token = (await cookies()).get(AGENT_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "not linked" }, { status: 401 });

  const res = await fetch(`${API_BASE}/prompts/${encodeURIComponent(id)}/buyers`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) return NextResponse.json({ error: "not implemented" }, { status: 501 });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
