import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

/** Whether a label can still be claimed under the parent name. */
export async function GET(request: Request) {
  const label = new URL(request.url).searchParams.get("label") ?? "";
  const res = await fetch(`${API_BASE}/ens/available?label=${encodeURIComponent(label)}`, {
    cache: "no-store",
  });
  if (res.status === 404) {
    // apps/api has not shipped this yet; say so rather than reporting a name free.
    return NextResponse.json({ error: "not implemented" }, { status: 501 });
  }
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
