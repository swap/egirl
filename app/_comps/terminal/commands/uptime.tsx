function fmt(sec: number) {
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600) % 24;
  const d = Math.floor(sec / 86400);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  if (m || h || d) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

async function run(_args: string[]) {
  const res = await fetch("/api/v2/me", { cache: "no-store" });
  const data = (await res.json()) as {
    stack?: { uptime?: number };
    uptime?: number;
    error?: string;
  };
  if (!res.ok) return data.error || "uptime failed";

  const page = performance.now() / 1000;
  const server = data.stack?.uptime ?? data.uptime ?? 0;
  return `server ${fmt(server)}\nsession ${fmt(page)}`;
}

const help = "Show server and session uptime";
const group = "system";

export { run, help, group };
