import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AGENT_COOKIE } from "@/lib/agent";
import { API_BASE } from "@/lib/api";

/**
 * Publishes a prompt as the signed-in wallet.
 *
 * A proxy rather than a direct call from the page, because the agent token
 * lives in an httpOnly cookie and must never reach client JavaScript. That
 * token is also what tells `apps/api` whose account gets paid: `payTo` is taken
 * from it and ignored in the body, so a form cannot publish a prompt that pays
 * somebody else.
 *
 * The body is passed through untouched. Validation belongs to the API, which is
 * the only place that cannot be bypassed, and its message is what the form
 * shows.
 */
export async function POST(request: Request) {
  const token = (await cookies()).get(AGENT_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Set up payments before publishing." }, { status: 401 });
  }

  const res = await fetch(`${API_BASE}/prompts`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: await request.text(),
  });
  if (res.status === 404) {
    return NextResponse.json({ error: "not implemented" }, { status: 501 });
  }
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
