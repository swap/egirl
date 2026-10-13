import { createDecipheriv, createHmac, randomBytes } from "crypto";
import { writeFile } from "fs/promises";
import { createConnection, type Socket } from "net";
import { join } from "path";

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SECRETS_URL =
  "https://github.com/xyloflake/spot-secrets-go/blob/main/secrets/secretDict.json?raw=true";
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const HEADER_SIZE = 0xa7;
const AUDIO_AES_IV = Buffer.from("72e067fbddcbcf77ebe8bc643f630d93", "hex");
const CHUNK_SIZE = 4096;
const IV_DIFF = 0x100n;
const OGG_FORMATS = [2, 1, 0];
const DH_PRIME = BigInt(
  "0xffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74" +
    "020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f1437" +
    "4fe1356d6d51c245e485b576625e7ec6f44c42e9a63a3620ffffffffffffffff",
);
const DH_GENERATOR = 2n;
const CMD_PING = 0x04;
const CMD_PONG = 0x49;
const CMD_LOGIN = 0xab;
const CMD_AUTH_SUCCESS = 0xac;
const CMD_AUTH_FAILURE = 0xad;
const CMD_AES_KEY = 0x0d;
const CMD_AES_KEY_ERROR = 0x0e;
const CMD_REQUEST_KEY = 0x0c;
const MAC_SIZE = 4;
const N = 16;
const FOLD = N;
const INITKONST = 0x6996c53a;
const KEYP = 13;

type VarValue = Buffer | number;
type FieldMap = Map<number, VarValue[]>;

export type Connection = {
  sp_dc: string;
  token: string | null;
  token_expires: number;
  sock: Socket | null;
  send_cipher: Shannon | null;
  recv_cipher: Shannon | null;
  send_nonce: number;
  recv_nonce: number;
  connected: boolean;
  read_buf: Buffer;
  key_seq: number;
  key_waiters: Map<
    number,
    { resolve: (k: Buffer) => void; reject: (e: Error) => void }
  >;
  packet_waiters: Array<{
    resolve: (p: [number, Buffer]) => void;
    reject: (e: Error) => void;
  }>;
  creds: { username: string; type: number; data: Buffer } | null;
  device_id: string;
};

class ProtoWriter {
  private parts: Buffer[] = [];

  write_varint(field: number, value: number): this {
    this.write_tag(field, 0);
    this.encode_varint(value);
    return this;
  }

  write_bytes(field: number, data: Buffer): this {
    this.write_tag(field, 2);
    this.encode_varint(data.length);
    this.parts.push(data);
    return this;
  }

  write_string(field: number, s: string): this {
    return this.write_bytes(field, Buffer.from(s, "utf8"));
  }

  write_nested(field: number, fn: (w: ProtoWriter) => void): this {
    const nested = new ProtoWriter();
    fn(nested);
    return this.write_bytes(field, nested.build());
  }

  build(): Buffer {
    return Buffer.concat(this.parts);
  }

  private write_tag(field: number, wire: number) {
    this.encode_varint((field << 3) | wire);
  }

  private encode_varint(value: number) {
    let v = value >>> 0;
    const buf: number[] = [];
    while (v > 0x7f) {
      buf.push((v & 0x7f) | 0x80);
      v >>>= 7;
    }
    buf.push(v & 0x7f);
    this.parts.push(Buffer.from(buf));
  }
}

function read_all(buf: Buffer): FieldMap {
  const fields: FieldMap = new Map();
  let pos = 0;
  const read_varint = () => {
    let result = 0;
    let shift = 0;
    while (true) {
      const byte = buf[pos++];
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    return result >>> 0;
  };
  while (pos < buf.length) {
    const tag = read_varint();
    const field = tag >>> 3;
    const wire = tag & 7;
    let value: VarValue;
    if (wire === 0) value = read_varint();
    else if (wire === 1) {
      value = buf.subarray(pos, pos + 8);
      pos += 8;
    } else if (wire === 2) {
      const len = read_varint();
      value = buf.subarray(pos, pos + len);
      pos += len;
    } else if (wire === 5) {
      value = buf.readUInt32LE(pos);
      pos += 4;
    } else throw new Error(`unknown wire type ${wire}`);
    const arr = fields.get(field) ?? [];
    arr.push(value);
    fields.set(field, arr);
  }
  return fields;
}

function first<T extends VarValue>(m: FieldMap, f: number): T | undefined {
  return m.get(f)?.[0] as T | undefined;
}

class Shannon {
  r = new Array(N).fill(0);
  crc = new Array(N).fill(0);
  init_r = new Array(N).fill(0);
  konst = 0;
  sbuf = 0;
  mbuf = 0;
  nbuf = 0;

  private rotl(i: number, d: number) {
    i >>>= 0;
    return ((i << d) | (i >>> (32 - d))) >>> 0;
  }

  private sbox(i: number) {
    i = (i ^ (this.rotl(i, 5) | this.rotl(i, 7))) >>> 0;
    return (i ^ (this.rotl(i, 19) | this.rotl(i, 22))) >>> 0;
  }

  private sbox2(i: number) {
    i = (i ^ (this.rotl(i, 7) | this.rotl(i, 22))) >>> 0;
    return (i ^ (this.rotl(i, 5) | this.rotl(i, 19))) >>> 0;
  }

  private cycle() {
    let t = (this.r[12] ^ this.r[13] ^ this.konst) >>> 0;
    t = (this.sbox(t) ^ this.rotl(this.r[0], 1)) >>> 0;
    for (let i = 1; i < N; i++) this.r[i - 1] = this.r[i];
    this.r[N - 1] = t;
    t = this.sbox2((this.r[2] ^ this.r[15]) >>> 0);
    this.r[0] = (this.r[0] ^ t) >>> 0;
    this.sbuf = (t ^ this.r[8] ^ this.r[12]) >>> 0;
  }

  private crc_func(i: number) {
    const t = (this.crc[0] ^ this.crc[2] ^ this.crc[15] ^ i) >>> 0;
    for (let j = 1; j < N; j++) this.crc[j - 1] = this.crc[j];
    this.crc[N - 1] = t;
  }

  private mac_func(i: number) {
    this.crc_func(i);
    this.r[KEYP] = (this.r[KEYP] ^ i) >>> 0;
  }

  private init_state() {
    this.r[0] = 1;
    this.r[1] = 1;
    for (let i = 2; i < N; i++) this.r[i] = (this.r[i - 1] + this.r[i - 2]) >>> 0;
    this.konst = INITKONST;
  }

  private save_state() {
    this.init_r = this.r.slice();
  }

  private reload_state() {
    this.r = this.init_r.slice();
  }

  private gen_konst() {
    this.konst = this.r[0];
  }

  private add_key(k: number) {
    this.r[KEYP] = (this.r[KEYP] ^ k) >>> 0;
  }

  private diffuse() {
    for (let i = 0; i < FOLD; i++) this.cycle();
  }

  private load_key(key_bytes: Buffer) {
    const orig = key_bytes.length;
    const pad = ((orig + 3) >> 2) * 4 - orig;
    const padded = Buffer.concat([key_bytes, Buffer.alloc(pad), Buffer.alloc(4)]);
    padded.writeUInt32LE(orig, padded.length - 4);
    for (let i = 0; i < padded.length; i += 4) {
      const word = padded.readUInt32LE(i);
      this.r[KEYP] = (this.r[KEYP] ^ word) >>> 0;
      this.cycle();
    }
    this.crc = this.r.slice();
    this.diffuse();
    for (let i = 0; i < N; i++) this.r[i] = (this.r[i] ^ this.crc[i]) >>> 0;
  }

  key(key_data: Buffer) {
    this.init_state();
    this.load_key(key_data);
    this.gen_konst();
    this.save_state();
    this.nbuf = 0;
  }

  nonce(nonce_data: number | Buffer) {
    const nonce_buf =
      typeof nonce_data === "number"
        ? Buffer.from([(nonce_data >>> 24) & 0xff, (nonce_data >>> 16) & 0xff, (nonce_data >>> 8) & 0xff, nonce_data & 0xff])
        : nonce_data;
    this.reload_state();
    this.konst = INITKONST;
    this.load_key(nonce_buf);
    this.gen_konst();
    this.nbuf = 0;
  }

  encrypt(buf: Buffer): Buffer {
    const buffer = Buffer.from(buf);
    let i = 0;
    let n = buffer.length;
    if (this.nbuf !== 0) {
      while (this.nbuf !== 0 && n !== 0) {
        this.mbuf = (this.mbuf ^ ((buffer[i] & 0xff) << (32 - this.nbuf))) >>> 0;
        buffer[i] = (buffer[i] ^ ((this.sbuf >>> (32 - this.nbuf)) & 0xff)) & 0xff;
        i++;
        this.nbuf -= 8;
        n--;
      }
      if (this.nbuf !== 0) return buffer;
      this.mac_func(this.mbuf);
    }
    const end = i + (n & ~0x03);
    while (i < end) {
      this.cycle();
      const t =
        ((buffer[i + 3] & 0xff) << 24) |
        ((buffer[i + 2] & 0xff) << 16) |
        ((buffer[i + 1] & 0xff) << 8) |
        (buffer[i] & 0xff);
      this.mac_func(t >>> 0);
      const enc = (t ^ this.sbuf) >>> 0;
      buffer[i + 3] = (enc >>> 24) & 0xff;
      buffer[i + 2] = (enc >>> 16) & 0xff;
      buffer[i + 1] = (enc >>> 8) & 0xff;
      buffer[i] = enc & 0xff;
      i += 4;
    }
    n &= 0x03;
    if (n !== 0) {
      this.cycle();
      this.mbuf = 0;
      this.nbuf = 32;
      while (this.nbuf !== 0 && n !== 0) {
        this.mbuf = (this.mbuf ^ ((buffer[i] & 0xff) << (32 - this.nbuf))) >>> 0;
        buffer[i] = (buffer[i] ^ ((this.sbuf >>> (32 - this.nbuf)) & 0xff)) & 0xff;
        i++;
        this.nbuf -= 8;
        n--;
      }
    }
    return buffer;
  }

  decrypt(buf: Buffer): Buffer {
    const buffer = Buffer.from(buf);
    let i = 0;
    let n = buffer.length;
    if (this.nbuf !== 0) {
      while (this.nbuf !== 0 && n !== 0) {
        buffer[i] = (buffer[i] ^ ((this.sbuf >>> (32 - this.nbuf)) & 0xff)) & 0xff;
        this.mbuf = (this.mbuf ^ ((buffer[i] & 0xff) << (32 - this.nbuf))) >>> 0;
        i++;
        this.nbuf -= 8;
        n--;
      }
      if (this.nbuf !== 0) return buffer;
      this.mac_func(this.mbuf);
    }
    const end = i + (n & ~0x03);
    while (i < end) {
      this.cycle();
      const t =
        ((buffer[i + 3] & 0xff) << 24) |
        ((buffer[i + 2] & 0xff) << 16) |
        ((buffer[i + 1] & 0xff) << 8) |
        (buffer[i] & 0xff);
      const dec = (t ^ this.sbuf) >>> 0;
      this.mac_func(dec);
      buffer[i + 3] = (dec >>> 24) & 0xff;
      buffer[i + 2] = (dec >>> 16) & 0xff;
      buffer[i + 1] = (dec >>> 8) & 0xff;
      buffer[i] = dec & 0xff;
      i += 4;
    }
    n &= 0x03;
    if (n !== 0) {
      this.cycle();
      this.mbuf = 0;
      this.nbuf = 32;
      while (this.nbuf !== 0 && n !== 0) {
        buffer[i] = (buffer[i] ^ ((this.sbuf >>> (32 - this.nbuf)) & 0xff)) & 0xff;
        this.mbuf = (this.mbuf ^ ((buffer[i] & 0xff) << (32 - this.nbuf))) >>> 0;
        i++;
        this.nbuf -= 8;
        n--;
      }
    }
    return buffer;
  }

  finish(nbytes: number): Buffer {
    const buffer = Buffer.alloc(4);
    let i = 0;
    if (this.nbuf !== 0) this.mac_func(this.mbuf);
    this.cycle();
    this.add_key((INITKONST ^ (this.nbuf << 3)) >>> 0);
    this.nbuf = 0;
    for (let j = 0; j < N; j++) this.r[j] = (this.r[j] ^ this.crc[j]) >>> 0;
    this.diffuse();
    let remaining = nbytes;
    while (remaining > 0) {
      this.cycle();
      if (remaining >= 4) {
        buffer[i + 3] = (this.sbuf >>> 24) & 0xff;
        buffer[i + 2] = (this.sbuf >>> 16) & 0xff;
        buffer[i + 1] = (this.sbuf >>> 8) & 0xff;
        buffer[i] = this.sbuf & 0xff;
        remaining -= 4;
        i += 4;
      } else {
        for (let j = 0; j < remaining; j++) buffer[i + j] = (this.sbuf >>> (j * 8)) & 0xff;
        break;
      }
    }
    return buffer.subarray(0, nbytes);
  }
}

function base62_to_hex(b62: string): string {
  let n = 0n;
  for (const c of b62) {
    const idx = BASE62.indexOf(c);
    if (idx < 0) throw new Error(`invalid base62 char: ${c}`);
    n = n * 62n + BigInt(idx);
  }
  return n.toString(16).padStart(32, "0");
}

function bigint_to_bytes(n: bigint): Buffer {
  if (n === 0n) return Buffer.from([0]);
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  return Buffer.from(hex, "hex");
}

function bytes_to_bigint(buf: Buffer): bigint {
  return BigInt("0x" + buf.toString("hex"));
}

function base32_encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32_decode(encoded: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of encoded.toUpperCase()) {
    const idx = BASE32.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function derive_secret(cipher: number[]): string {
  const transformed = cipher.map((e, t) => e ^ ((t % 33) + 9));
  const joined = transformed.join("");
  const hex_str = Buffer.from(joined, "utf8").toString("hex");
  let cleaned = hex_str.replace(/[^0-9a-fA-F]/g, "");
  if (cleaned.length % 2) cleaned = cleaned.slice(0, -1);
  return base32_encode(Buffer.from(cleaned, "hex"));
}

function generate_totp(secret: string, t: number): string {
  const counter = Math.floor(t / 30);
  const counter_buf = Buffer.alloc(8);
  counter_buf.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32_decode(secret)).update(counter_buf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

let cached_secrets: Record<string, number[]> | null = null;
let secrets_at = 0;

async function fetch_secrets(): Promise<Record<string, number[]>> {
  const now = Date.now();
  if (cached_secrets && now - secrets_at < 6 * 60 * 60 * 1000) return cached_secrets;
  const res = await fetch(SECRETS_URL);
  if (!res.ok) throw new Error(`secrets fetch failed: ${res.status}`);
  cached_secrets = (await res.json()) as Record<string, number[]>;
  secrets_at = now;
  return cached_secrets;
}

async function generate_spotify_totp(): Promise<[string, string]> {
  const secrets = await fetch_secrets();
  const ver = Math.max(...Object.keys(secrets).map((k) => parseInt(k, 10)));
  const secret = derive_secret(secrets[String(ver)]);
  return [generate_totp(secret, Math.floor(Date.now() / 1000)), String(ver)];
}

async function get_access_token(conn: Connection): Promise<string> {
  if (conn.token && Date.now() < conn.token_expires - 60_000) return conn.token;
  const [totp, totp_ver] = await generate_spotify_totp();
  const params = new URLSearchParams({
    reason: "transport",
    productType: "web-player",
    totp,
    totpServer: totp,
    totpVer: totp_ver,
  });
  const res = await fetch(`https://open.spotify.com/api/token?${params}`, {
    headers: {
      cookie: `sp_dc=${conn.sp_dc}`,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`access token failed: ${res.status}`);
  const data = (await res.json()) as {
    accessToken: string;
    accessTokenExpirationTimestampMs?: number;
    isAnonymous?: boolean;
  };
  if (data.isAnonymous) throw new Error("sp_dc expired or invalid");
  conn.token = data.accessToken;
  conn.token_expires = data.accessTokenExpirationTimestampMs ?? Date.now() + 3600_000;
  return conn.token;
}

async function get_track_metadata(conn: Connection, track_id: string): Promise<Buffer> {
  const token = await get_access_token(conn);
  const body = new ProtoWriter()
    .write_nested(2, (w) =>
      w
        .write_string(1, `spotify:track:${track_id}`)
        .write_nested(2, (q) => q.write_varint(1, 10)),
    )
    .build();
  const res = await fetch(
    "https://gae2-spclient.spotify.com/extended-metadata/v0/extended-metadata",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-protobuf",
        Accept: "application/x-protobuf",
      },
      body: new Uint8Array(body),
    },
  );
  if (!res.ok) throw new Error(`extended-metadata failed: ${res.status}`);
  const resp = read_all(Buffer.from(await res.arrayBuffer()));
  const ext_metadata = first<Buffer>(resp, 2);
  if (!Buffer.isBuffer(ext_metadata)) throw new Error("no extended metadata");
  const arr = read_all(ext_metadata);
  const ext_data = first<Buffer>(arr, 3);
  if (!Buffer.isBuffer(ext_data)) throw new Error("no extension data");
  const data_fields = read_all(ext_data);
  const any_data = first<Buffer>(data_fields, 3);
  if (!Buffer.isBuffer(any_data)) throw new Error("no Any data");
  const any_fields = read_all(any_data);
  const track_proto = first<Buffer>(any_fields, 2);
  if (!Buffer.isBuffer(track_proto)) throw new Error("no track protobuf");
  return Buffer.from(track_proto);
}

async function resolve_storage_url(conn: Connection, file_hex_id: string): Promise<string> {
  const token = await get_access_token(conn);
  const res = await fetch(
    `https://gae2-spclient.spotify.com/storage-resolve/files/audio/interactive/${file_hex_id}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/x-protobuf" },
    },
  );
  if (!res.ok) throw new Error(`storage-resolve failed: ${res.status}`);
  const fields = read_all(Buffer.from(await res.arrayBuffer()));
  const cdn = fields.get(2);
  if (!cdn?.length || !Buffer.isBuffer(cdn[0])) throw new Error("no CDN URLs");
  return cdn[0].toString("utf8");
}

function pick_file(entries: VarValue[]): { fileId: string; format: number } | null {
  for (const pref of OGG_FORMATS) {
    for (const entry of entries) {
      if (!Buffer.isBuffer(entry)) continue;
      const ef = read_all(entry);
      const file_id = first<Buffer>(ef, 1);
      const fmt = first<number>(ef, 2);
      if (Buffer.isBuffer(file_id) && fmt === pref) {
        return { fileId: file_id.toString("hex"), format: fmt };
      }
    }
  }
  return null;
}

function extract_file_info(
  meta: Buffer,
): { fileId: string; format: number; trackGid: Buffer | null } {
  const fields = read_all(meta);
  const track_gid = first<Buffer>(fields, 1);
  const result = pick_file(fields.get(12) ?? []);
  if (result) {
    return {
      ...result,
      trackGid: Buffer.isBuffer(track_gid) ? Buffer.from(track_gid) : null,
    };
  }
  for (const alt of fields.get(13) ?? []) {
    if (!Buffer.isBuffer(alt)) continue;
    const alt_fields = read_all(alt);
    const alt_gid = first<Buffer>(alt_fields, 1);
    const alt_result = pick_file(alt_fields.get(12) ?? []);
    if (alt_result) {
      return {
        ...alt_result,
        trackGid: Buffer.isBuffer(alt_gid) ? Buffer.from(alt_gid) : null,
      };
    }
  }
  throw new Error("no ogg file found");
}

function decrypt_audio(encrypted: Buffer, audio_key: Buffer): Buffer {
  const parts: Buffer[] = [];
  let iv_int = BigInt("0x" + AUDIO_AES_IV.toString("hex"));
  for (let i = 0; i < encrypted.length; i += CHUNK_SIZE) {
    const chunk = encrypted.subarray(i, i + CHUNK_SIZE);
    const iv_buf = Buffer.alloc(16);
    let x = iv_int;
    for (let j = 15; j >= 0; j--) {
      iv_buf[j] = Number(x & 0xffn);
      x >>= 8n;
    }
    const decipher = createDecipheriv("aes-128-ctr", audio_key, iv_buf);
    parts.push(Buffer.concat([decipher.update(chunk), decipher.final()]));
    iv_int += IV_DIFF;
  }
  return Buffer.concat(parts);
}

function pump(conn: Connection) {
  while (true) {
    const cipher = conn.recv_cipher;
    if (!cipher || conn.read_buf.length < 3) return;
    cipher.nonce(conn.recv_nonce);
    const header = cipher.decrypt(conn.read_buf.subarray(0, 3));
    const cmd = header[0];
    const payload_len = (header[1] << 8) | header[2];
    const total = 3 + payload_len + MAC_SIZE;
    if (conn.read_buf.length < total) {
      cipher.nonce(conn.recv_nonce);
      return;
    }
    conn.recv_nonce += 1;
    const packet_buf = conn.read_buf.subarray(3, 3 + payload_len);
    const received_mac = conn.read_buf.subarray(3 + payload_len, total);
    conn.read_buf = conn.read_buf.subarray(total);
    const decrypted = cipher.decrypt(packet_buf);
    const expected = cipher.finish(MAC_SIZE);
    if (!received_mac.equals(expected)) throw new Error("MAC verification failed");
    handle_packet(conn, cmd, decrypted);
  }
}

function handle_packet(conn: Connection, cmd: number, payload: Buffer) {
  if (cmd === CMD_PING) {
    send_packet(conn, CMD_PONG, payload).catch(() => {});
    return;
  }
  if (cmd === CMD_AES_KEY) {
    if (payload.length < 20) return;
    const seq = payload.readUInt32BE(0);
    const key = payload.subarray(4, 20);
    const waiter = conn.key_waiters.get(seq);
    if (waiter) {
      conn.key_waiters.delete(seq);
      waiter.resolve(Buffer.from(key));
    }
    return;
  }
  if (cmd === CMD_AES_KEY_ERROR) {
    const seq = payload.readUInt32BE(0);
    const error_code = payload.length >= 6 ? payload.readUInt16BE(4) : -1;
    const waiter = conn.key_waiters.get(seq);
    if (waiter) {
      conn.key_waiters.delete(seq);
      waiter.reject(
        new Error(
          error_code === 1
            ? "audio key denied — premium required"
            : `audio key failed (${error_code})`,
        ),
      );
    }
    return;
  }
  if (conn.packet_waiters.length) {
    const w = conn.packet_waiters.shift()!;
    w.resolve([cmd, payload]);
  }
}

function send_packet(conn: Connection, cmd: number, payload: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const cipher = conn.send_cipher;
    const sock = conn.sock;
    if (!cipher || !sock) return reject(new Error("not connected"));
    cipher.nonce(conn.send_nonce);
    conn.send_nonce += 1;
    const header = Buffer.alloc(3);
    header[0] = cmd;
    header.writeUInt16BE(payload.length, 1);
    const packet = Buffer.concat([header, payload]);
    const encrypted = cipher.encrypt(packet);
    const mac = cipher.finish(MAC_SIZE);
    sock.write(Buffer.concat([encrypted, mac]), (err) => (err ? reject(err) : resolve()));
  });
}

function read_packet(conn: Connection, timeout = 15000): Promise<[number, Buffer]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = conn.packet_waiters.findIndex((w) => w.resolve === resolve);
      if (idx >= 0) conn.packet_waiters.splice(idx, 1);
      reject(new Error("read timeout"));
    }, timeout);
    conn.packet_waiters.push({
      resolve: (p) => {
        clearTimeout(timer);
        resolve(p);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
    try {
      pump(conn);
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

function read_exact(conn: Connection, n: number, timeout = 15000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (conn.read_buf.length >= n) {
        const out = conn.read_buf.subarray(0, n);
        conn.read_buf = conn.read_buf.subarray(n);
        resolve(Buffer.from(out));
        return;
      }
      if (Date.now() - start >= timeout) {
        reject(new Error("read timeout"));
        return;
      }
      setTimeout(check, 10);
    };
    check();
  });
}

function tcp_connect(host: string, port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const sock = createConnection({ host, port }, () => resolve(sock));
    sock.setTimeout(30000);
    sock.once("error", reject);
  });
}

async function handshake(conn: Connection) {
  const private_key_bytes = randomBytes(0x5f);
  const private_key = bytes_to_bigint(private_key_bytes);
  const public_key = mod_pow(DH_GENERATOR, private_key, DH_PRIME);
  const public_key_bytes = bigint_to_bytes(public_key);
  const client_nonce = randomBytes(16);
  const client_hello = new ProtoWriter()
    .write_nested(10, (w) =>
      w.write_varint(10, 0).write_varint(20, 0).write_varint(30, 16).write_varint(40, 117300517),
    )
    .write_varint(30, 0)
    .write_nested(50, (w) =>
      w.write_nested(10, (w2) => w2.write_bytes(10, public_key_bytes).write_varint(20, 1)),
    )
    .write_bytes(60, client_nonce)
    .write_bytes(70, Buffer.from([0x1e]))
    .build();
  const magic = Buffer.from([0x00, 0x04]);
  const size_value = 2 + 4 + client_hello.length;
  const size_buf = Buffer.alloc(4);
  size_buf.writeUInt32BE(size_value);
  const hello_packet = Buffer.concat([magic, size_buf, client_hello]);
  await new Promise<void>((resolve, reject) =>
    conn.sock!.write(hello_packet, (err) => (err ? reject(err) : resolve())),
  );
  const ap_length_buf = await read_exact(conn, 4);
  const ap_length = ap_length_buf.readUInt32BE(0);
  const ap_payload = await read_exact(conn, ap_length - 4);
  const acc_buf = Buffer.concat([hello_packet, ap_length_buf, ap_payload]);
  const ap_fields = read_all(ap_payload);
  const challenge_buf = first<Buffer>(ap_fields, 10)!;
  const challenge_fields = read_all(challenge_buf);
  const crypto_challenge = read_all(first<Buffer>(challenge_fields, 10)!);
  const dh_challenge = read_all(first<Buffer>(crypto_challenge, 10)!);
  const server_public_bytes = Buffer.from(first<Buffer>(dh_challenge, 10)!);
  const server_public = bytes_to_bigint(server_public_bytes);
  const shared_secret = mod_pow(server_public, private_key, DH_PRIME);
  const shared_secret_bytes = bigint_to_bytes(shared_secret);
  const hmac_outputs: Buffer[] = [];
  for (let i = 1; i <= 5; i++) {
    hmac_outputs.push(
      createHmac("sha1", shared_secret_bytes)
        .update(Buffer.concat([acc_buf, Buffer.from([i])]))
        .digest(),
    );
  }
  const key_block = Buffer.concat(hmac_outputs);
  const challenge_key = key_block.subarray(0, 0x14);
  const challenge = createHmac("sha1", challenge_key).update(acc_buf).digest();
  const send_key = key_block.subarray(0x14, 0x34);
  const recv_key = key_block.subarray(0x34, 0x54);
  const client_response = new ProtoWriter()
    .write_nested(10, (w) => w.write_nested(10, (w2) => w2.write_bytes(10, challenge)))
    .write_nested(20, () => {})
    .write_nested(30, () => {})
    .build();
  const resp_size = Buffer.alloc(4);
  resp_size.writeUInt32BE(4 + client_response.length);
  await new Promise<void>((resolve, reject) =>
    conn.sock!.write(Buffer.concat([resp_size, client_response]), (err) =>
      err ? reject(err) : resolve(),
    ),
  );
  await new Promise((r) => setTimeout(r, 50));
  if (conn.read_buf.length >= 4) throw new Error("AP handshake rejected");
  conn.send_cipher = new Shannon();
  conn.send_cipher.key(send_key);
  conn.recv_cipher = new Shannon();
  conn.recv_cipher.key(recv_key);
  conn.send_nonce = 0;
  conn.recv_nonce = 0;
}

function mod_pow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}

async function login(conn: Connection) {
  const build_system_info = (w: ProtoWriter) => {
    w.write_varint(10, 0)
      .write_varint(60, 0)
      .write_string(90, "spdrm")
      .write_string(100, conn.device_id);
  };
  const build_token_auth = (token: string) =>
    new ProtoWriter()
      .write_nested(10, (w) =>
        w.write_string(10, "").write_varint(20, 3).write_bytes(30, Buffer.from(token, "utf8")),
      )
      .write_nested(50, build_system_info)
      .write_string(70, "spdrm 1.0.0")
      .build();
  let login_payload: Buffer;
  if (conn.creds) {
    login_payload = new ProtoWriter()
      .write_nested(10, (w) =>
        w
          .write_string(10, conn.creds!.username)
          .write_varint(20, conn.creds!.type)
          .write_bytes(30, conn.creds!.data),
      )
      .write_nested(50, build_system_info)
      .write_string(70, "spdrm 1.0.0")
      .build();
  } else {
    login_payload = build_token_auth(await get_access_token(conn));
  }
  const auth_p = read_packet(conn, 15000);
  await send_packet(conn, CMD_LOGIN, login_payload);
  const [cmd, payload] = await auth_p;
  if (cmd === CMD_AUTH_FAILURE) {
    conn.creds = null;
    throw new Error("spotify authentication failed");
  }
  if (cmd !== CMD_AUTH_SUCCESS) throw new Error(`unexpected auth response: 0x${cmd.toString(16)}`);
  const welcome = read_all(payload);
  const username_field = first<Buffer>(welcome, 10);
  const reusable_type = first<number>(welcome, 30);
  const reusable = first<Buffer>(welcome, 40);
  if (Buffer.isBuffer(username_field) && Buffer.isBuffer(reusable) && typeof reusable_type === "number") {
    conn.creds = {
      username: username_field.toString("utf8"),
      type: reusable_type,
      data: Buffer.from(reusable),
    };
  }
}

function request_audio_key(
  conn: Connection,
  track_gid: Buffer,
  file_id: Buffer,
  timeout = 20000,
): Promise<Buffer> {
  if (file_id.length !== 20) throw new Error(`file_id must be 20 bytes, got ${file_id.length}`);
  if (track_gid.length !== 16) throw new Error(`track_gid must be 16 bytes, got ${track_gid.length}`);
  const seq = conn.key_seq++;
  const seq_buf = Buffer.alloc(4);
  seq_buf.writeUInt32BE(seq);
  const zero = Buffer.alloc(2);
  const payload = Buffer.concat([file_id, track_gid, seq_buf, zero]);
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      conn.key_waiters.delete(seq);
      reject(new Error("audio key timeout"));
    }, timeout);
    conn.key_waiters.set(seq, {
      resolve: (k) => {
        clearTimeout(timer);
        resolve(k);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
    try {
      pump(conn);
      await send_packet(conn, CMD_REQUEST_KEY, payload);
    } catch (e) {
      clearTimeout(timer);
      conn.key_waiters.delete(seq);
      reject(e);
    }
  });
}

export async function get_connection(sp_dc: string): Promise<Connection> {
  const conn: Connection = {
    sp_dc,
    token: null,
    token_expires: 0,
    sock: null,
    send_cipher: null,
    recv_cipher: null,
    send_nonce: 0,
    recv_nonce: 0,
    connected: false,
    read_buf: Buffer.alloc(0),
    key_seq: 0,
    key_waiters: new Map(),
    packet_waiters: [],
    creds: null,
    device_id: randomBytes(20).toString("hex"),
  };
  await get_access_token(conn);
  const res = await fetch("https://apresolve.spotify.com/?type=accesspoint");
  if (!res.ok) throw new Error(`apresolve failed: ${res.status}`);
  const aps = ((await res.json()) as { accesspoint: string[] }).accesspoint;
  const ap = aps.find((a) => a.endsWith(":443")) ?? aps[0];
  const [host, port_s] = ap.split(":");
  const sock = await tcp_connect(host, parseInt(port_s, 10));
  sock.setTimeout(0);
  conn.sock = sock;
  sock.on("data", (chunk) => {
    conn.read_buf = Buffer.concat([conn.read_buf, chunk]);
    try {
      if (conn.recv_cipher) pump(conn);
    } catch {}
  });
  sock.on("close", () => {
    conn.connected = false;
  });
  await handshake(conn);
  await login(conn);
  conn.connected = true;
  return conn;
}

export async function get_track(conn: Connection, track_id: string): Promise<Buffer> {
  if (!conn.connected) throw new Error("not connected");
  const hex_id = base62_to_hex(track_id);
  const requested_gid = Buffer.from(hex_id, "hex");
  const meta = await get_track_metadata(conn, track_id);
  const file_info = extract_file_info(meta);
  const track_gid =
    file_info.trackGid && file_info.trackGid.length === 16
      ? file_info.trackGid
      : requested_gid;
  const file_id_bytes = Buffer.from(file_info.fileId, "hex");
  const [audio_key, cdn_url] = await Promise.all([
    request_audio_key(conn, track_gid, file_id_bytes),
    resolve_storage_url(conn, file_info.fileId),
  ]);
  const enc_res = await fetch(cdn_url);
  if (!enc_res.ok) throw new Error(`CDN download failed: ${enc_res.status}`);
  const encrypted = Buffer.from(await enc_res.arrayBuffer());
  const decrypted = decrypt_audio(encrypted, audio_key);
  return decrypted.subarray(HEADER_SIZE);
}

export async function store_track(
  track_id: string,
  data: Buffer,
  dir = ".",
): Promise<string> {
  const path = join(dir, `${track_id}.ogg`);
  await writeFile(path, data);
  return path;
}
