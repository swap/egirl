import type { APIRoute } from "astro";
import { allow, client_ip, limited } from "@/app/_comps/lib/limit";

export const GET: APIRoute = function ({ request }) {
  const ip = client_ip(request);
  const gate = allow(ip, "ping", 20, 60_000);
  if (!gate.ok) return limited(gate.retry);

  return Response.json(
    {
      error: "external ping disabled · use: ping",
      hint: "outbound icmp blocked to hide origin behind cloudflare",
    },
    { status: 403 },
  );
};
