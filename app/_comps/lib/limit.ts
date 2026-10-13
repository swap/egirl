type Hit = {
  n: number;
  reset: number;
};

type Bytes = {
  n: number;
  reset: number;
};

const hits = new Map<string, Hit>();
const bandwidth = new Map<string, Bytes>();

function client_ip(req: Request) {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function allow(
  ip: string,
  bucket: string,
  max: number,
  window_ms: number,
): { ok: true } | { ok: false; retry: number } {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now >= cur.reset) {
    hits.set(key, { n: 1, reset: now + window_ms });
    return { ok: true };
  }
  if (cur.n >= max) {
    return { ok: false, retry: Math.max(1, Math.ceil((cur.reset - now) / 1000)) };
  }
  cur.n += 1;
  return { ok: true };
}

function allow_bytes(
  ip: string,
  add: number,
  max: number,
  window_ms: number,
): { ok: true } | { ok: false; retry: number } {
  const key = ip;
  const now = Date.now();
  const cur = bandwidth.get(key);
  if (!cur || now >= cur.reset) {
    if (add > max) return { ok: false, retry: Math.ceil(window_ms / 1000) };
    bandwidth.set(key, { n: add, reset: now + window_ms });
    return { ok: true };
  }
  if (cur.n + add > max) {
    return { ok: false, retry: Math.max(1, Math.ceil((cur.reset - now) / 1000)) };
  }
  cur.n += add;
  return { ok: true };
}

function limited(retry: number) {
  return Response.json(
    { error: `rate limited · retry in ${retry}s` },
    {
      status: 429,
      headers: {
        "retry-after": String(retry),
        "cache-control": "no-store",
      },
    },
  );
}

export { client_ip, allow, allow_bytes, limited };
