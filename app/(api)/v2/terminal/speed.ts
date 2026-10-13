import type { APIRoute } from "astro";
import {
  allow,
  allow_bytes,
  client_ip,
  limited,
} from "@/app/_comps/lib/limit";

const MAX = 128 * 1024;
const BUDGET = 2 * 1024 * 1024;
const HOUR = 60 * 60 * 1000;

export const GET: APIRoute = function ({ request, url }) {
  const ip = client_ip(request);
  const gate = allow(ip, "speed", 6, 60_000);
  if (!gate.ok) return limited(gate.retry);

  const n = Math.min(
    MAX,
    Math.max(1, Number(url.searchParams.get("bytes")) || 64 * 1024),
  );

  const bw = allow_bytes(ip, n, BUDGET, HOUR);
  if (!bw.ok) return limited(bw.retry);

  return new Response(new Uint8Array(n), {
    headers: {
      "content-type": "application/octet-stream",
      "cache-control": "no-store",
      "content-length": String(n),
    },
  });
};

export const POST: APIRoute = async function ({ request }) {
  const ip = client_ip(request);
  const gate = allow(ip, "speed", 6, 60_000);
  if (!gate.ok) return limited(gate.retry);

  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX) {
    return Response.json({ error: "payload too large" }, { status: 413 });
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return Response.json({ received: 0 }, { headers: { "cache-control": "no-store" } });
  }

  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX) {
      try {
        await reader.cancel();
      } catch {}
      return Response.json({ error: "payload too large" }, { status: 413 });
    }
  }

  const bw = allow_bytes(ip, total, BUDGET, HOUR);
  if (!bw.ok) return limited(bw.retry);

  return Response.json(
    { received: total },
    { headers: { "cache-control": "no-store" } },
  );
};
