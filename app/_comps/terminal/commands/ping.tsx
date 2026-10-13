function fmt(ms: number) {
  return ms.toFixed(1);
}

function mbps(bytes: number, ms: number) {
  if (ms <= 0) return 0;
  return (bytes * 8) / (ms / 1000) / 1e6;
}

const host_re =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^(?:\d{1,3}\.){3}\d{1,3}$/;

function ok_host(host: string) {
  if (!host || host.length > 253) return false;
  if (host.includes(" ") || host.includes("/") || host.includes("\\")) return false;
  return host_re.test(host);
}

async function self_run() {
  const host = typeof location !== "undefined" ? location.host : "localhost";
  const count = 4;
  const times: number[] = [];

  try {
    await fetch("/api/v2/hi", { cache: "no-store" });
  } catch {}

  for (let i = 0; i < count; i++) {
    const t0 = performance.now();
    const res = await fetch(`/api/v2/hi?n=${i}`, { cache: "no-store" });
    await res.arrayBuffer();
    times.push(performance.now() - t0);
  }

  const dsize = 64 * 1024;
  const dt0 = performance.now();
  const dres = await fetch(`/api/v2/terminal/speed?bytes=${dsize}`, {
    cache: "no-store",
  });
  if (dres.status === 429) return "rate limited · try again later";
  const dbuf = await dres.arrayBuffer();
  const dms = performance.now() - dt0;
  const down = mbps(dbuf.byteLength, dms);

  const usize = 32 * 1024;
  const payload = new Uint8Array(usize);
  const ut0 = performance.now();
  const ures = await fetch("/api/v2/terminal/speed", {
    method: "POST",
    body: payload,
    cache: "no-store",
  });
  if (ures.status === 429) return "rate limited · try again later";
  const ums = performance.now() - ut0;
  const up = mbps(usize, ums);

  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;

  return [
    `PING ${host} (self) 56(84) bytes of data.`,
    ...times.map(
      (t, i) =>
        `64 bytes from self: icmp_seq=${i + 1} ttl=64 time=${fmt(t)} ms`,
    ),
    "",
    `--- ${host} ping statistics ---`,
    `${count} packets transmitted, ${count} received, 0% packet loss`,
    `rtt min/avg/max = ${fmt(min)}/${fmt(avg)}/${fmt(max)} ms`,
    `download: ${down.toFixed(1)} Mbps`,
    `upload: ${up.toFixed(1)} Mbps`,
  ].join("\n");
}

async function browser_ping(host: string) {
  if (!ok_host(host)) return `invalid host: ${host}`;

  const count = 4;
  const times: number[] = [];
  let lost = 0;
  const target = `https://${host}/`;

  for (let i = 0; i < count; i++) {
    const t0 = performance.now();
    try {
      await fetch(target, {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
      });
      times.push(performance.now() - t0);
    } catch {
      lost += 1;
    }
  }

  if (!times.length) {
    return `ping: ${host} · no response (browser probe)`;
  }

  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;

  return [
    `PING ${host} (browser) · origin not used`,
    ...times.map(
      (t, i) =>
        `probe_seq=${i + 1} time=${fmt(t)} ms`,
    ),
    "",
    `--- ${host} ping statistics ---`,
    `${count} probes, ${times.length} ok, ${lost} failed`,
    `rtt min/avg/max = ${fmt(min)}/${fmt(avg)}/${fmt(max)} ms`,
  ].join("\n");
}

async function run(args: string[]) {
  if (!args[0]) return self_run();
  return browser_ping(args[0]);
}

const help = "Ping self, or ping <host> from your browser";
const group = "network";

export { run, help, group };
