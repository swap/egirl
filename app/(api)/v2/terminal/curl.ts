import type { APIRoute } from "astro";
import { probe } from "@/app/_comps/lib/http_probe";
import { allow, client_ip, limited } from "@/app/_comps/lib/limit";

export const GET: APIRoute = async function ({ request, url }) {
  const ip = client_ip(request);
  const gate = allow(ip, "curl", 8, 60_000);
  if (!gate.ok) return limited(gate.retry);

  const target = url.searchParams.get("url") || url.searchParams.get("host");
  if (!target) {
    return Response.json({ error: "usage: curl <url>" }, { status: 400 });
  }

  const method = url.searchParams.get("method") || "GET";
  const result = await probe(target, method);
  return Response.json({
    ok: result.ok,
    output: result.output,
  });
};
