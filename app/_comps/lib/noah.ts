import { readFileSync } from "fs";
import { join } from "path";
import { client_ip } from "@/app/_comps/lib/limit";

function from_env_file() {
  try {
    const text = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      if (t.slice(0, i).trim() !== "NOAH_IPS") continue;
      return t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
  return "";
}

function ips() {
  return (from_env_file() || process.env.NOAH_IPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ip_of(req: Request, fallback = "") {
  const from_headers = client_ip(req);
  if (from_headers && from_headers !== "unknown") return from_headers;
  return fallback || "unknown";
}

function norm(ip: string) {
  const v = ip.trim().toLowerCase();
  if (v.startsWith("::ffff:")) return v.slice(7);
  return v;
}

function local(ip: string) {
  const v = norm(ip);
  return (
    v === "localhost" ||
    v === "127.0.0.1" ||
    v === "::1" ||
    v === "0:0:0:0:0:0:0:1"
  );
}

function noah_ok(req: Request, fallback = "") {
  const mine = norm(ip_of(req, fallback));
  const list = ips().map(norm);
  if (!list.length) return false;
  if (list.includes(mine)) return true;
  if (local(mine) && list.some(local)) return true;
  return false;
}

export { noah_ok };
