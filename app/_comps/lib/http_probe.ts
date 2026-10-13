import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const HOST_RE =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^(?:\d{1,3}\.){3}\d{1,3}$/;

const BLOCK = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

function bad_ip(ip: string) {
  if (ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("127.") || ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.") || ip.startsWith("169.254.")) return true;
  if (ip.startsWith("0.") || ip.startsWith("100.64.")) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80"))
    return true;
  return false;
}

function ok_url(raw: string) {
  let u: URL;
  try {
    u = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== "80" && u.port !== "443") return null;
  const host = u.hostname.toLowerCase();
  if (!host || host.length > 253) return null;
  if (BLOCK.has(host) || host.endsWith(".local") || host.endsWith(".internal"))
    return null;
  if (!HOST_RE.test(host)) return null;
  if (isIP(host) && bad_ip(host)) return null;
  return u;
}

type Probe = {
  ok: boolean;
  output: string;
};

async function resolve_ok(host: string) {
  if (isIP(host)) return !bad_ip(host);
  try {
    const addrs = await lookup(host, { all: true, hints: 0 });
    if (!addrs.length) return false;
    return addrs.every((a) => !bad_ip(a.address));
  } catch {
    return false;
  }
}

async function probe(raw: string, method = "GET"): Promise<Probe> {
  const u = ok_url(raw);
  if (!u) return { ok: false, output: `invalid url: ${raw}` };

  const safe = await resolve_ok(u.hostname);
  if (!safe) return { ok: false, output: `blocked host: ${u.hostname}` };

  const verb = method.toUpperCase() === "HEAD" ? "HEAD" : "GET";
  const t0 = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(u.toString(), {
      method: verb,
      redirect: "manual",
      signal: ctrl.signal,
      headers: { "user-agent": "egirl-curl/1.0", accept: "*/*" },
    });
    const ms = performance.now() - t0;
    let bytes = Number(res.headers.get("content-length") || 0);
    if (verb === "GET" && res.body) {
      const reader = res.body.getReader();
      let n = 0;
      const cap = 64 * 1024;
      while (n < cap) {
        const { done, value } = await reader.read();
        if (done) break;
        n += value.byteLength;
      }
      try {
        await reader.cancel();
      } catch {}
      bytes = n;
    }

    const lines = [
      `* connected to ${u.hostname}`,
      `> ${verb} ${u.pathname}${u.search || ""} HTTP/1.1`,
      `> Host: ${u.host}`,
      `< HTTP ${res.status} ${res.statusText || ""}`.trimEnd(),
      `< content-type: ${res.headers.get("content-type") || "-"}`,
      `< content-length: ${res.headers.get("content-length") || bytes || "-"}`,
      `< server: ${res.headers.get("server") || "-"}`,
      "",
      `time ${ms.toFixed(1)} ms · ${bytes} bytes`,
    ];
    return { ok: res.ok || res.status < 400, output: lines.join("\n") };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, output: `curl: (${u.hostname}) ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

export { probe, ok_url };
export type { Probe };
