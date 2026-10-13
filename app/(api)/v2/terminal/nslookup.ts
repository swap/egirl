import type { APIRoute } from "astro";
import { Resolver } from "node:dns/promises";
import { ok_host } from "@/app/_comps/lib/icmp";
import { allow, client_ip, limited } from "@/app/_comps/lib/limit";

export const GET: APIRoute = async function ({ request, url }) {
  const ip = client_ip(request);
  const gate = allow(ip, "nslookup", 10, 60_000);
  if (!gate.ok) return limited(gate.retry);

  const host = url.searchParams.get("host") || "";
  if (!ok_host(host)) {
    return Response.json(
      { error: `invalid host: ${host || "(empty)"}` },
      { status: 400 },
    );
  }

  const resolver = new Resolver();
  resolver.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8"]);

  const lines: string[] = [
    `Server:\t\t1.1.1.1`,
    `Address:\t1.1.1.1#53`,
    "",
    `Name:\t${host}`,
  ];

  try {
    const [v4, v6] = await Promise.all([
      resolver.resolve4(host).catch(() => [] as string[]),
      resolver.resolve6(host).catch(() => [] as string[]),
    ]);

    if (!v4.length && !v6.length) {
      return Response.json({
        ok: false,
        output: `** server can't find ${host}: NXDOMAIN`,
      });
    }

    for (const addr of v4) lines.push(`Address:\t${addr}`);
    for (const addr of v6) lines.push(`Address:\t${addr}`);

    return Response.json({ ok: true, output: lines.join("\n") });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, output: `nslookup: ${msg}` });
  }
};
