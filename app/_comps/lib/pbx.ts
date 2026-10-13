import type { PbxCore } from "@snowcats/pbx";

export const hdr = "x-pbx";
const priv = ["/api/v2/*"];
const pub = [
  "/api/v2/image/*",
  "/api/v2/music/stream",
  "/api/v2/music/now",
  "/api/v2/terminal/speed",
];

function norm(path: string) {
  const bare = path.split("?")[0] || path;
  const slash = bare.startsWith("/") ? bare : `/${bare}`;
  return slash.replace(/\/+$/, "") || "/";
}

function match(pattern: string, path: string) {
  const pat = norm(pattern);
  const url = norm(path);
  if (pat.endsWith("/*")) {
    const prefix = pat.slice(0, -2);
    return url === prefix || url.startsWith(`${prefix}/`);
  }
  if (pat.endsWith("/**")) {
    const prefix = pat.slice(0, -3);
    return url === prefix || url.startsWith(`${prefix}/`);
  }
  return pat === url;
}

export function covered(path: string, on: boolean) {
  if (!on) return false;
  if (pub.some((p) => match(p, path))) return false;
  return priv.some((p) => match(p, path));
}

type Sdk = typeof import("@snowcats/pbx");

let sdk: Sdk | null = null;
let core: PbxCore | null = null;

async function load() {
  if (!sdk) sdk = await import("@snowcats/pbx");
  return sdk;
}

export async function engine() {
  if (process.env.PBX_PROTECTED !== "true") return null;
  if (core) return core;
  const mod = await load();
  core = new mod.PbxCore(
    mod.loadConfigFromEnv({
      protectedMode: true,
      routes: { protected: priv, public: pub },
    }),
  );
  return core;
}

export async function gate(request: Request, next: () => Promise<Response>) {
  const path = new URL(request.url).pathname;
  const pb = await engine();
  if (!pb || !pb.requiresProtection(path)) return next();

  try {
    let raw = new Uint8Array(await request.arrayBuffer());
    if (!raw.length) {
      const header = request.headers.get(hdr);
      if (!header) throw new (await load()).PbxError("InvalidEnvelope");
      raw = new Uint8Array(Buffer.from(header, "base64"));
    }
    const processed = pb.processRequest(path, raw);
    const response = await next();
    const payload = new Uint8Array(await response.arrayBuffer());
    const encoded = pb.processResponse(path, payload, processed.protected);
    const headers = new Headers(response.headers);
    headers.set("content-type", encoded.contentType || "application/vnd.pbx");
    headers.delete("content-length");
    return new Response(encoded.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const mod = await load();
    if (error instanceof mod.PbxError) {
      return Response.json(
        { error: mod.publicErrorMessage(error.code) },
        { status: mod.publicStatusCode(error.code) },
      );
    }
    throw error;
  }
}

type Env = {
  version: number;
  keyId: string;
  timestampMs: number;
  requestId: string;
  nonce: Uint8Array;
  wrappedDek: Uint8Array;
  ciphertext: Uint8Array;
  mac: Uint8Array;
};

function cat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function text(value: string) {
  return new TextEncoder().encode(value);
}

function rand(n: number) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

function pref(part: Uint8Array) {
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, part.length);
  return cat(len, part);
}

function stamp(ms: number) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigInt64(0, BigInt(ms));
  return bytes;
}

function canonical(env: Env) {
  return cat(
    pref(Uint8Array.of(env.version)),
    pref(text(env.keyId)),
    pref(stamp(env.timestampMs)),
    pref(text(env.requestId)),
    pref(env.nonce),
    pref(env.wrappedDek),
    pref(env.ciphertext),
  );
}

function same(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function derive(key: Uint8Array, keyId: string, info: string) {
  const base = await crypto.subtle.importKey("raw", key, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: text(keyId), info: text(info) },
    base,
    256,
  );
  return new Uint8Array(bits);
}

async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

async function aes(key: Uint8Array, nonce: Uint8Array, plain: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, k, plain),
  );
  return cat(nonce, ct);
}

async function unaes(key: Uint8Array, blob: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]);
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: blob.subarray(0, 12), tagLength: 128 },
      k,
      blob.subarray(12),
    ),
  );
}

function varint(value: number | bigint) {
  let n = typeof value === "bigint" ? value : BigInt(value);
  const out: number[] = [];
  while (n > 127n) {
    out.push(Number((n & 127n) | 128n));
    n >>= 7n;
  }
  out.push(Number(n));
  return Uint8Array.from(out);
}

function field(no: number, wire: number, data: Uint8Array) {
  return cat(varint((no << 3) | wire), data);
}

function take(raw: Uint8Array, i: number) {
  let n = 0n;
  let shift = 0n;
  while (i < raw.length) {
    const b = raw[i++]!;
    n |= BigInt(b & 127) << shift;
    if ((b & 128) === 0) return { n, i };
    shift += 7n;
    if (shift > 63n) break;
  }
  throw new Error("envelope");
}

function chunk(raw: Uint8Array, i: number) {
  const len = take(raw, i);
  const end = len.i + Number(len.n);
  if (end > raw.length) throw new Error("envelope");
  return { data: raw.subarray(len.i, end), i: end };
}

function encode(env: Env) {
  return cat(
    field(1, 0, varint(env.version)),
    field(2, 2, cat(varint(text(env.keyId).length), text(env.keyId))),
    field(3, 0, varint(env.timestampMs)),
    field(4, 2, cat(varint(text(env.requestId).length), text(env.requestId))),
    field(5, 2, cat(varint(env.nonce.length), env.nonce)),
    field(6, 2, cat(varint(env.wrappedDek.length), env.wrappedDek)),
    field(7, 2, cat(varint(env.ciphertext.length), env.ciphertext)),
    field(8, 2, cat(varint(env.mac.length), env.mac)),
  );
}

function decode(raw: Uint8Array): Env {
  const env: Env = {
    version: 0,
    keyId: "",
    timestampMs: 0,
    requestId: "",
    nonce: new Uint8Array(),
    wrappedDek: new Uint8Array(),
    ciphertext: new Uint8Array(),
    mac: new Uint8Array(),
  };
  let i = 0;
  const utf = new TextDecoder();
  while (i < raw.length) {
    const tag = take(raw, i);
    i = tag.i;
    const no = Number(tag.n >> 3n);
    const wire = Number(tag.n & 7n);
    if (wire === 0) {
      const v = take(raw, i);
      i = v.i;
      if (no === 1) env.version = Number(v.n);
      if (no === 3) env.timestampMs = Number(v.n);
      continue;
    }
    if (wire !== 2) throw new Error("envelope");
    const part = chunk(raw, i);
    i = part.i;
    const copy = new Uint8Array(part.data);
    if (no === 2) env.keyId = utf.decode(copy);
    if (no === 4) env.requestId = utf.decode(copy);
    if (no === 5) env.nonce = copy;
    if (no === 6) env.wrappedDek = copy;
    if (no === 7) env.ciphertext = copy;
    if (no === 8) env.mac = copy;
  }
  return env;
}

export function key_bytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export async function seal(
  key: Uint8Array,
  keyId: string,
  data: unknown,
  requestId = crypto.randomUUID(),
  timestampMs = Date.now(),
) {
  const dek = rand(32);
  const wrappedDek = await aes(await derive(key, keyId, "pbx-wrap"), rand(12), dek);
  const ciphertext = await aes(dek, rand(12), text(JSON.stringify(data)));
  const partial: Env = {
    version: 1,
    keyId,
    timestampMs,
    requestId,
    nonce: rand(12),
    wrappedDek,
    ciphertext,
    mac: new Uint8Array(),
  };
  partial.mac = await hmac(await derive(key, keyId, "pbx-mac"), canonical(partial));
  return encode(partial);
}

export async function unveil(key: Uint8Array, raw: Uint8Array) {
  const env = decode(raw);
  if (env.version !== 1 || !env.keyId) throw new Error("envelope");
  const mac = await hmac(await derive(key, env.keyId, "pbx-mac"), canonical(env));
  if (!same(mac, env.mac)) throw new Error("mac");
  const dek = await unaes(await derive(key, env.keyId, "pbx-wrap"), env.wrappedDek);
  return unaes(dek, env.ciphertext);
}

export async function open(key: Uint8Array, raw: Uint8Array) {
  return JSON.parse(new TextDecoder().decode(await unveil(key, raw)));
}

type Opts = {
  key: string;
  id: string;
  on: boolean;
  origin: string;
};

export async function pbx_fetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fetchImpl: typeof fetch,
  opts: Opts,
) {
  const href =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(href, opts.origin);
  if (!opts.on || url.origin !== new URL(opts.origin).origin || !covered(url.pathname, true)) {
    return fetchImpl(input, init);
  }

  const raw = input instanceof Request ? input : null;
  const method = (init?.method || raw?.method || "GET").toUpperCase();
  const headers = new Headers(raw?.headers);
  if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));

  const key = key_bytes(opts.key);
  let data: unknown = {};
  if (typeof init?.body === "string") {
    try {
      data = JSON.parse(init.body);
    } catch {
      data = {};
    }
  }

  const envelope = await seal(key, opts.id || "primary", data);
  const next: RequestInit = {
    method,
    headers,
    cache: init?.cache ?? raw?.cache,
    signal: init?.signal ?? raw?.signal,
    credentials: init?.credentials ?? raw?.credentials,
  };

  if (method === "GET" || method === "HEAD") {
    headers.set(hdr, b64(envelope));
  } else {
    headers.set("content-type", "application/vnd.pbx");
    headers.delete("content-length");
    next.body = envelope;
  }

  const res = await fetchImpl(url, next);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/vnd.pbx")) return res;

  try {
    const plain = new TextDecoder().decode(
      await unveil(key, new Uint8Array(await res.arrayBuffer())),
    );
    let type = "text/plain;charset=utf-8";
    try {
      JSON.parse(plain);
      type = "application/json";
    } catch {}
    const out = new Headers(res.headers);
    out.set("content-type", type);
    out.delete("content-length");
    return new Response(plain, {
      status: res.status,
      statusText: res.statusText,
      headers: out,
    });
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
}

let live = false;

export function install() {
  if (live || typeof window === "undefined") return;
  const env = import.meta.env as {
    PBX_PROTECTED?: string;
    PBX_KEY?: string;
    PBX_KEY_ID?: string;
  };
  const on = env.PBX_PROTECTED === "true";
  const key = env.PBX_KEY || "";
  const id = env.PBX_KEY_ID || "primary";
  if (!on || !key) return;
  try {
    if (key_bytes(key).length < 32) return;
  } catch {
    return;
  }
  live = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input, init) =>
    pbx_fetch(input, init, orig, { key, id, on: true, origin: location.origin });
}
