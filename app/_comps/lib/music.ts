import { get_connection, get_track, type Connection } from "./spdrm";
import { get_richsync } from "./musixmatch";

type Word = {
  start: number;
  end: number;
  text: string;
};

type Line = {
  start: number;
  end: number;
  text: string;
  words: Word[];
};

type Now = {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  url: string;
  playing: boolean;
  progress: number;
  duration: number;
};

type Lyric = {
  id: string;
  name: string;
  artist: string;
  sync: "none" | "line" | "word";
  lines: Line[];
};

let access = "";
let expires = 0;
let drm: Connection | null = null;

async function token() {
  if (access && Date.now() < expires) return access;
  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN!;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
  });
  if (!res.ok) throw new Error("spotify");
  const data = await res.json();
  access = data.access_token;
  expires = Date.now() + (data.expires_in - 60) * 1000;
  return access;
}

async function api(path: string) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error("spotify");
  return res.json();
}

function img(items: { url: string }[]) {
  return items.at(-1)?.url || "";
}

function img_big(
  items: { url: string; height?: number; width?: number }[] | undefined,
) {
  if (!items?.length) return "";
  const sorted = [...items].sort(
    (a, b) => (b.height || b.width || 0) - (a.height || a.width || 0),
  );
  return sorted[0]?.url || items[0]?.url || "";
}

function is_spotify_img(url: string) {
  return /scdn\.co|spotifycdn\.com|mosaic\.scdn/i.test(url);
}

function is_placeholder_img(url: string) {
  return !url || url.includes("2a96cbd8b46e442fc41c2b86b821562f");
}

function prefer_img(...urls: (string | undefined)[]) {
  const all = urls.filter((u): u is string => !!u && !is_placeholder_img(u));
  return all.find((u) => is_spotify_img(u)) || all[0] || "";
}

type SpotifyFav = {
  type: "track" | "album";
  name: string;
  artist: string;
  album: string;
  image: string;
  url: string;
};

function spotify_id(input: string, kind: "track" | "album") {
  const raw = input.trim();
  const uri = raw.match(new RegExp(`^spotify:${kind}:([a-zA-Z0-9]+)$`));
  if (uri) return uri[1];
  try {
    const u = new URL(raw);
    if (u.hostname.includes("spotify.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const i = parts.indexOf(kind);
      if (i >= 0 && parts[i + 1]) return parts[i + 1].split("?")[0];
    }
  } catch {}
  if (/^[a-zA-Z0-9]{22}$/.test(raw)) return raw;
  return null;
}

function spotify_kind(input: string): "track" | "album" | null {
  const raw = input.trim();
  if (/^spotify:track:/i.test(raw) || /spotify\.com\/track\//i.test(raw)) {
    return "track";
  }
  if (/^spotify:album:/i.test(raw) || /spotify\.com\/album\//i.test(raw)) {
    return "album";
  }
  return null;
}

async function spotify_track(input: string): Promise<SpotifyFav> {
  const id = spotify_id(input, "track");
  if (!id) throw new Error("bad track");
  const data = await api(`/tracks/${id}`);
  return {
    type: "track",
    name: data.name,
    artist: data.artists.map((a: { name: string }) => a.name).join(", "),
    album: data.album?.name || "",
    image: img_big(data.album?.images),
    url: data.external_urls?.spotify || `https://open.spotify.com/track/${id}`,
  };
}

async function spotify_album(input: string): Promise<SpotifyFav> {
  const id = spotify_id(input, "album");
  if (!id) throw new Error("bad album");
  const data = await api(`/albums/${id}`);
  return {
    type: "album",
    name: data.name,
    artist: data.artists.map((a: { name: string }) => a.name).join(", "),
    album: data.name,
    image: img_big(data.images),
    url: data.external_urls?.spotify || `https://open.spotify.com/album/${id}`,
  };
}

async function get_now(): Promise<Now | null> {
  const data = await api("/me/player/currently-playing");
  if (!data?.item) return null;
  const item = data.item;
  return {
    id: item.id,
    name: item.name,
    artist: item.artists.map((a: { name: string }) => a.name).join(", "),
    album: item.album.name,
    image: img(item.album.images || []),
    url: item.external_urls.spotify,
    playing: data.is_playing,
    progress: data.progress_ms || 0,
    duration: item.duration_ms || 0,
  };
}

async function connection() {
  if (drm?.connected) return drm;
  drm = await get_connection(process.env.SPOTIFY_SP_COOKIE!);
  return drm;
}

async function get_audio(id: string) {
  try {
    return await get_track(await connection(), id);
  } catch {
    drm = null;
    return get_track(await connection(), id);
  }
}

let track_id = "";
let track_data: Buffer | null = null;
let track_load: Promise<void> | null = null;

function clear_track() {
  track_id = "";
  track_data = null;
  track_load = null;
}

function track_ready(id: string) {
  return track_id === id && !!track_data;
}

function load_track(id: string) {
  if (track_id === id && (track_data || track_load)) return track_load;
  track_id = id;
  track_data = null;
  track_load = get_audio(id)
    .then((data) => {
      if (track_id === id) track_data = data;
    })
    .catch(() => {
      if (track_id === id) track_data = null;
    })
    .finally(() => {
      if (track_id === id) track_load = null;
    });
  return track_load;
}

function peek_track(id?: string) {
  if (!track_data) return null;
  if (id && track_id !== id) return null;
  return { id: track_id, data: track_data };
}

const top: { id: string; data: Buffer | null; load: Promise<Buffer> | null } = {
  id: "",
  data: null,
  load: null,
};

async function top_audio(id: string) {
  if (!id || id !== top.id) return null;
  if (top.data) return top.data;
  if (!top.load) {
    top.load = get_audio(id)
      .then((data) => {
        if (top.id === id) top.data = data;
        return data;
      })
      .finally(() => {
        if (top.id === id) top.load = null;
      });
  }
  return top.load;
}

const FAV_MAX = 6;
const favs = new Map<string, { data: Buffer | null; load: Promise<Buffer> | null }>();

function fav_allowed(id: string) {
  const list = store.music_stats_cache?.loved || [];
  return list.some((t) => spotify_id(t.url, "track") === id);
}

async function fav_audio(id: string) {
  if (!id || !fav_allowed(id)) return null;
  let hit = favs.get(id);
  if (hit?.data) {
    favs.delete(id);
    favs.set(id, hit);
    return hit.data;
  }
  if (!hit) {
    hit = { data: null, load: null };
    favs.set(id, hit);
    while (favs.size > FAV_MAX) {
      const oldest = favs.keys().next().value;
      if (oldest === undefined || oldest === id) break;
      favs.delete(oldest);
    }
  }
  if (!hit.load) {
    const h = hit;
    h.load = get_audio(id)
      .then((data) => {
        h.data = data;
        return data;
      })
      .catch((e) => {
        favs.delete(id);
        throw e;
      })
      .finally(() => {
        h.load = null;
      });
  }
  return hit.load;
}

function sync_top(stats: Stats) {
  const id = spotify_id(stats.tracks[0]?.url || "", "track") || "";
  if (id === top.id) return;
  top.id = id;
  top.data = null;
  top.load = null;
  if (!id) return;
  void top_audio(id).catch(() => {});
  void load_lyric(id).catch(() => {});
}

type RawSyllable = {
  startTimeMs: string;
  endTimeMs: string;
  numChars?: string;
  charsCount?: string;
};

type RawLine = {
  startTimeMs: string;
  endTimeMs: string;
  words: string;
  syllables?: RawSyllable[];
};

function words_of(line: RawLine): Word[] {
  const syllables = line.syllables || [];
  if (!syllables.length) return [];
  const chars = [...line.words];
  let i = 0;
  const raw = syllables.map((s) => {
    const n = Number(s.numChars || s.charsCount || 0);
    const text = chars.slice(i, i + n).join("");
    i += n;
    return {
      start: Number(s.startTimeMs),
      end: Number(s.endTimeMs),
      text,
    };
  });

  const out: Word[] = [];
  for (const w of raw) {
    if (!w.text.trim()) {
      if (out.length) {
        out[out.length - 1].text += w.text;
        out[out.length - 1].end = Math.max(out[out.length - 1].end, w.end);
      }
      continue;
    }
    const prev = out[out.length - 1];
    if (prev && !/\s$/.test(prev.text) && !/^\s/.test(w.text)) {
      prev.text += w.text;
      prev.end = Math.max(prev.end, w.end);
      continue;
    }
    out.push({ ...w });
  }
  return out;
}

async function track_meta(id: string) {
  try {
    const data = await api(`/tracks/${id}`);
    return {
      name: (data?.name as string) || "",
      artist: (data?.artists?.[0]?.name as string) || "",
      isrc: (data?.external_ids?.isrc as string) || "",
    };
  } catch {
    return { name: "", artist: "", isrc: "" };
  }
}

async function get_spotify_lyric(id: string): Promise<Lyric | null> {
  const conn = await connection();
  const res = await fetch(
    `https://spclient.wg.spotify.com/color-lyrics/v2/track/${id}/?format=json&vocalRemoval=false&market=from_token`,
    {
      headers: {
        Authorization: `Bearer ${conn.token}`,
        "App-Platform": "WebPlayer",
        Accept: "application/json",
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const block = data.lyrics;
  if (!block?.lines?.length) return null;
  const lines = (block.lines as RawLine[]).map((line) => ({
    start: Number(line.startTimeMs),
    end: Number(line.endTimeMs),
    text: line.words,
    words: words_of(line),
  }));
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].end) {
      lines[i].end = lines[i + 1]?.start || lines[i].start;
    }
  }
  const sync =
    block.syncType === "SYLLABLE_SYNCED" || lines.some((l) => l.words.length)
      ? "word"
      : block.syncType === "LINE_SYNCED"
        ? "line"
        : "none";
  return {
    id,
    name: data.trackName || "",
    artist: data.artistName || "",
    sync,
    lines,
  };
}

function norm_line(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shift_lyric(lyric: Lyric, ms: number): Lyric {
  if (!ms) return lyric;
  return {
    ...lyric,
    lines: lyric.lines.map((l) => ({
      ...l,
      start: Math.max(0, l.start + ms),
      end: Math.max(0, l.end + ms),
      words: l.words.map((w) => ({
        ...w,
        start: Math.max(0, w.start + ms),
        end: Math.max(0, w.end + ms),
      })),
    })),
  };
}

function fit_words(
  words: Word[],
  from: number,
  to: number,
  src_from: number,
  src_to: number,
): Word[] {
  const span = Math.max(1, src_to - src_from);
  const out = Math.max(1, to - from);
  return words.map((w) => ({
    ...w,
    start: Math.round(from + ((w.start - src_from) / span) * out),
    end: Math.round(from + ((w.end - src_from) / span) * out),
  }));
}

function align_to_spotify(lyric: Lyric, spotify: Lyric | null): Lyric {
  if (!spotify?.lines.length || !lyric.lines.length) {
    const sp0 = Number(spotify?.lines?.[0]?.start || 0);
    const ly0 = lyric.lines[0]?.start || 0;
    if (sp0 > 0 && ly0 > 0) {
      const shift = sp0 - ly0;
      if (Math.abs(shift) > 40 && Math.abs(shift) < 2500) {
        return shift_lyric(lyric, shift);
      }
    }
    return lyric;
  }

  const by = new Map<string, Line[]>();
  for (const l of spotify.lines) {
    const key = norm_line(l.text);
    if (!key) continue;
    const arr = by.get(key) || [];
    arr.push(l);
    by.set(key, arr);
  }

  return {
    ...lyric,
    lines: lyric.lines.map((line) => {
      const key = norm_line(line.text);
      const hits = by.get(key);
      const sp = hits?.shift();
      if (!sp) return line;
      const next_sp = spotify.lines.find((l) => l.start > sp.start);
      const end =
        sp.end && sp.end > sp.start
          ? sp.end
          : next_sp?.start ||
            sp.start + Math.max(800, line.end - line.start || 0);
      return {
        ...line,
        start: sp.start,
        end,
        words: line.words.length
          ? fit_words(line.words, sp.start, end, line.start, line.end || end)
          : line.words,
      };
    }),
  };
}

async function get_lyric(id: string): Promise<Lyric | null> {
  const meta = await track_meta(id);
  const [spotify, rich] = await Promise.all([
    get_spotify_lyric(id),
    get_richsync(id, meta),
  ]);

  if (spotify?.sync === "word" && spotify.lines.some((l) => l.words.length)) {
    return {
      ...spotify,
      name: spotify.name || meta.name,
      artist: spotify.artist || meta.artist,
    };
  }

  if (rich?.sync === "word" && rich.lines.some((l) => l.words.length)) {
    const base = {
      ...rich,
      name: rich.name || spotify?.name || meta.name,
      artist: rich.artist || spotify?.artist || meta.artist,
    };
    return spotify ? align_to_spotify(base, spotify) : base;
  }

  const lyric = spotify || rich;
  if (!lyric?.lines.length) return lyric;
  return lyric;
}

function line_at(lyric: Lyric | null, ms: number) {
  if (!lyric?.lines.length) return null;
  for (let i = lyric.lines.length - 1; i >= 0; i--) {
    if (ms >= lyric.lines[i].start) return lyric.lines[i];
  }
  return null;
}

function next_at(lyric: Lyric | null, ms: number) {
  if (!lyric?.lines.length) return null;
  return lyric.lines.find((l) => l.start > ms) || null;
}

function first_word(line: Line | null) {
  return line?.words.find((w) => w.text.trim()) || null;
}

function last_word(line: Line | null) {
  if (!line?.words.length) return null;
  for (let i = line.words.length - 1; i >= 0; i--) {
    if (line.words[i].text.trim()) return line.words[i];
  }
  return null;
}

function word_at(lyric: Lyric | null, ms: number) {
  const line = line_at(lyric, ms);
  if (!line?.words.length) return null;
  const first = first_word(line);
  const last = last_word(line);
  if (!first || !last) return null;
  if (ms < first.start) return null;
  if (ms > Math.max(last.end, line.end || last.start)) return null;
  let cur: Word | null = null;
  for (const w of line.words) {
    if (ms >= w.start && w.text.trim()) cur = w;
  }
  return cur;
}

function next_word(lyric: Lyric | null, ms: number) {
  const line = line_at(lyric, ms);
  if (line?.words.length) {
    const next = line.words.find((w) => w.start > ms && w.text.trim());
    if (next) return next;
  }
  const upcoming = next_at(lyric, ms);
  return upcoming?.words.find((w) => w.text.trim()) || null;
}

const lyric_cache = new Map<string, Lyric>();

async function load_lyric(id: string) {
  if (lyric_cache.has(id)) return lyric_cache.get(id)!;
  const lyric = await get_lyric(id);
  if (lyric) lyric_cache.set(id, lyric);
  return lyric;
}

async function live(signal: AbortSignal, send: (data: unknown) => void) {
  let last: Now | null = null;
  let fetched = 0;
  let lyric: Lyric | null = null;
  let loaded = "";
  let lyric_sent = "";
  let was_playing: boolean | null = null;

  const stop = () => clear_track();
  signal.addEventListener("abort", stop, { once: true });

  while (!signal.aborted) {
    try {
      const at = Date.now();
      const stale = !last || at - fetched > (last.playing ? 3000 : 2000);
      if (stale) {
        last = await get_now();
        fetched = at;
        if (!last) {
          lyric = null;
          lyric_sent = "";
        } else if (!lyric || lyric.id !== last.id) {
          lyric = (await load_lyric(last.id)) || null;
        }
      }

      if (!last) {
        if (loaded) {
          clear_track();
          loaded = "";
          lyric_sent = "";
        }
        send({ now: null, audio: false, at });
        was_playing = false;
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      if (last.id !== loaded) {
        loaded = last.id;
        lyric_sent = "";
        load_track(last.id);
        if (!lyric || lyric.id !== last.id) {
          lyric = (await load_lyric(last.id)) || null;
        }
      }

      const progress = last.playing
        ? last.progress + (at - fetched)
        : last.progress;
      const packet: Record<string, unknown> = {
        now: { ...last, progress },
        line: line_at(lyric, progress),
        next: next_at(lyric, progress),
        word: word_at(lyric, progress),
        next_word: next_word(lyric, progress),
        audio: track_ready(last.id),
        at,
      };
      if (lyric && lyric_sent !== last.id) {
        packet.lyric = lyric;
        lyric_sent = last.id;
      }

      const prev = was_playing;
      was_playing = last.playing;

      if (!last.playing) {
        if (prev === null || prev === true || packet.lyric) {
          send(packet);
        }
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      send(packet);
    } catch {
      send({ error: "spotify", at: Date.now() });
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  clear_track();
}

function first_artist(artist: string) {
  return artist.split(",")[0].split("&")[0].trim();
}

function clean_title(name: string) {
  return name
    .replace(/\s*[\[(][^)\]]*[)\]]/g, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pick_track(
  items: {
    id: string;
    name: string;
    artists?: { name: string }[];
    album?: { images?: { url: string }[] };
    external_urls?: { spotify?: string };
  }[],
  name: string,
  artist: string,
) {
  const n = clean_title(name).toLowerCase();
  const a = artist.toLowerCase();
  return (
    items.find(
      (t) =>
        clean_title(t.name).toLowerCase() === n &&
        t.artists?.some((x) => x.name.toLowerCase() === a),
    ) ||
    items.find(
      (t) =>
        clean_title(t.name).toLowerCase() === n &&
        t.artists?.some(
          (x) =>
            x.name.toLowerCase().includes(a) ||
            a.includes(x.name.toLowerCase()),
        ),
    ) ||
    items.find((t) =>
      t.artists?.some(
        (x) =>
          x.name.toLowerCase().includes(a) || a.includes(x.name.toLowerCase()),
      ),
    ) ||
    items[0]
  );
}

function pick_album(
  items: {
    id: string;
    name: string;
    artists?: { name: string }[];
    images?: { url: string }[];
    external_urls?: { spotify?: string };
  }[],
  name: string,
  artist: string,
) {
  const n = clean_title(name).toLowerCase();
  const a = artist.toLowerCase();
  return (
    items.find(
      (t) =>
        clean_title(t.name).toLowerCase() === n &&
        t.artists?.some((x) => x.name.toLowerCase() === a),
    ) ||
    items.find((t) =>
      t.artists?.some(
        (x) =>
          x.name.toLowerCase().includes(a) || a.includes(x.name.toLowerCase()),
      ),
    ) ||
    items[0]
  );
}

async function track_video(id: string, attempt = 0): Promise<string> {
  try {
    const conn = await connection();
    const uri = `spotify:track:${id}`;
    const uri_buf = Buffer.from(uri);
    const track = Buffer.concat([
      Buffer.from([0x0a, uri_buf.length]),
      uri_buf,
    ]);
    const body = Buffer.concat([Buffer.from([0x0a, track.length]), track]);
    const res = await fetch(
      "https://spclient.wg.spotify.com/canvaz-cache/v0/canvases",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.token}`,
          "Content-Type": "application/x-protobuf",
          Accept: "application/protobuf",
          "App-Platform": "WebPlayer",
        },
        body,
      },
    );
    if (res.status === 401 || res.status === 403) {
      drm = null;
      if (attempt < 1) return track_video(id, attempt + 1);
      return "";
    }
    if (!res.ok) {
      if (attempt < 1) return track_video(id, attempt + 1);
      return "";
    }
    const raw = Buffer.from(await res.arrayBuffer()).toString("utf8");
    const match =
      raw.match(/https:\/\/canvaz\.scdn\.co\/[^\x00-\x1f"\\]+/) ||
      raw.match(/https:\/\/[a-z0-9.-]*scdn\.co\/[^\x00-\x1f"\\]+\.mp4/);
    return match?.[0] || "";
  } catch {
    drm = null;
    if (attempt < 1) return track_video(id, attempt + 1);
    return "";
  }
}

async function search_track(name: string, artist: string) {
  const a = first_artist(artist);
  const title = clean_title(name);
  const queries = [
    `track:${title} artist:${a}`,
    `${title} artist:${a}`,
    `${title} ${a}`,
  ];
  for (const q of queries) {
    try {
      const search = await api(
        `/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
      );
      const hit = pick_track(search?.tracks?.items || [], title, a);
      if (hit?.id) return hit;
    } catch {}
  }
  return null;
}

async function search_album(name: string, artist: string) {
  const a = first_artist(artist);
  const title = clean_title(name);
  const queries = [
    `album:${title} artist:${a}`,
    `${title} artist:${a}`,
    `${title} ${a}`,
  ];
  for (const q of queries) {
    try {
      const search = await api(
        `/search?q=${encodeURIComponent(q)}&type=album&limit=10`,
      );
      const hit = pick_album(search?.albums?.items || [], title, a);
      if (hit?.id) return hit;
    } catch {}
  }
  return null;
}

function clean_artist(name: string) {
  return name
    .replace(/\$/g, "s")
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function norm_artist(name: string) {
  return clean_artist(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function search_artist(name: string) {
  const queries = [name, clean_artist(name)].filter(
    (q, i, arr) => q && arr.indexOf(q) === i,
  );
  const n = norm_artist(name);

  for (const q of queries) {
    try {
      const search = await api(
        `/search?q=${encodeURIComponent(q)}&type=artist&limit=8`,
      );
      const items =
        (search?.artists?.items as {
          id: string;
          name: string;
          images?: { url: string; height?: number; width?: number }[];
          external_urls?: { spotify?: string };
        }[]) || [];
      if (!items.length) continue;

      const ranked = items
        .map((a) => {
          const an = norm_artist(a.name);
          const exact = an === n ? 3 : an.includes(n) || n.includes(an) ? 1 : 0;
          const imgs = a.images?.length ? 2 : 0;
          return { a, score: exact * 10 + imgs };
        })
        .sort((x, y) => y.score - x.score);

      const best =
        ranked.find((r) => r.score >= 12) ||
        ranked.find((r) => r.a.images?.length) ||
        ranked[0];
      if (best) return best.a;
    } catch {}
  }
  return null;
}

let partner = "";
let partner_at = 0;

async function partner_token() {
  if (partner && Date.now() < partner_at) return partner;
  const html = await (
    await fetch("https://open.spotify.com/embed/artist/0TnOYISbd1XYRBk9myaseg")
  ).text();
  const tok = html.match(/"accessToken":"([^"]+)"/)?.[1];
  if (!tok) return "";
  partner = tok;
  partner_at = Date.now() + 30 * 60 * 1000;
  return partner;
}

const banner_store = globalThis as typeof globalThis & {
  music_banner_cache?: Map<string, string>;
  music_banner_load?: Map<string, Promise<string>>;
};

function banner_map() {
  if (!banner_store.music_banner_cache) {
    banner_store.music_banner_cache = new Map();
  }
  return banner_store.music_banner_cache;
}

function banner_loads() {
  if (!banner_store.music_banner_load) {
    banner_store.music_banner_load = new Map();
  }
  return banner_store.music_banner_load;
}

function pick_source(
  sources: { url?: string; width?: number; height?: number }[] | undefined,
) {
  if (!sources?.length) return "";
  const sorted = [...sources].sort(
    (a, b) => (b.width || b.height || 0) - (a.width || a.height || 0),
  );
  return sorted[0]?.url || sources[0]?.url || "";
}

function size_banner(url: string) {
  if (!url) return "";
  return url
    .replace(/\/ab676167[0-9a-f]{8}/i, "/ab67616700001217")
    .replace(/\/ab67616d[0-9a-f]{8}/i, "/ab67616d0000b273");
}

async function artist_banner(id: string): Promise<string> {
  if (!id) return "";
  const cache = banner_map();
  const hit = cache.get(id);
  if (hit) return hit;

  const loads = banner_loads();
  const pending = loads.get(id);
  if (pending) return pending;

  const job = (async () => {
    try {
      const token = await partner_token();
      if (!token) return "";
      const hash =
        "433e28d1e949372d3ca3aa6c47975cff428b5dc37b12f5325d9213accadf770a";
      const variables = JSON.stringify({
        uri: `spotify:artist:${id}`,
        locale: "",
        includePrerelease: true,
      });
      const extensions = JSON.stringify({
        persistedQuery: { version: 1, sha256Hash: hash },
      });
      const url = `https://api-partner.spotify.com/pathfinder/v1/query?operationName=queryArtistOverview&variables=${encodeURIComponent(variables)}&extensions=${encodeURIComponent(extensions)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "App-Platform": "WebPlayer",
        },
      });
      if (!res.ok) return "";
      const j = await res.json();
      const visuals = j?.data?.artist?.visuals;
      const gallery = pick_source(visuals?.gallery?.items?.[0]?.sources);
      const header = pick_source(visuals?.headerImage?.sources);
      const raw = gallery || header;
      const banner = size_banner(raw);
      if (banner) cache.set(id, banner);
      return banner;
    } catch {
      return "";
    } finally {
      loads.delete(id);
    }
  })();

  loads.set(id, job);
  return job;
}

function fill_entry_banners(entries: Entry[], artists: Artist[]) {
  const by_name = new Map<string, string>();
  for (const a of artists) {
    if (!a.banner) continue;
    by_name.set(a.name.toLowerCase(), a.banner);
  }
  return entries.map((item) => {
    if (item.banner) return item;
    const banner =
      by_name.get(first_artist(item.artist).toLowerCase()) ||
      by_name.get(item.artist.toLowerCase()) ||
      "";
    return banner ? { ...item, banner } : item;
  });
}

async function artist_video(id: string): Promise<string> {
  if (!id) return "";
  const keys = [`artist:${id}`];
  const hit = cached_video(keys);
  if (hit) return hit;
  try {
    const tracks = await api(`/artists/${id}/top-tracks?market=US`);
    let video = "";
    for (const t of tracks?.tracks || []) {
      if (!t?.id) continue;
      video = await track_video(t.id);
      if (video) break;
    }
    if (video) remember_video(keys, video);
    return video;
  } catch {
    return "";
  }
}

async function enrich_artist(item: Artist): Promise<Artist> {
  try {
    const a = await search_artist(item.name);
    if (!a?.id) return item;
    const image = prefer_img(img_big(a.images), item.image);
    const banner = await artist_banner(a.id).catch(() => "");
    const video = await artist_video(a.id).catch(() => "");
    return {
      ...item,
      url: a.external_urls?.spotify || item.url,
      image,
      banner: banner || item.banner || "",
      video: video || item.video || "",
    };
  } catch {
    return item;
  }
}

async function enrich_track(item: Entry) {
  try {
    const keys = media_keys("track", item);
    const cached = cached_media(keys);
    const known = spotify_id(item.url, "track");
    let t = known ? await api(`/tracks/${known}`).catch(() => null) : null;
    if (!t?.id) t = await search_track(item.name, item.artist);
    if (!t?.id) {
      return {
        ...item,
        image: prefer_img(item.image, cached.image),
        banner: prefer_img(item.banner, cached.banner),
        video: item.video || "",
      };
    }
    const aid = (t.artists?.[0]?.id as string | undefined) || "";
    const banner = prefer_img(
      aid ? await artist_banner(aid) : "",
      cached.banner,
      item.banner,
    );
    const image = prefer_img(
      img_big(t.album?.images),
      cached.image,
      item.image,
    );
    const id = t.id as string;
    remember_media(media_keys("track", { ...item, _id: id }, id), {
      image,
      banner,
    });
    return {
      ...item,
      url: t.external_urls?.spotify || item.url,
      image,
      banner,
      video: item.video || "",
      album: (t.album?.name as string) || item.album || "",
      year: Number(String(t.album?.release_date || "").slice(0, 4)) || item.year || 0,
      secs: Math.round(Number(t.duration_ms || 0) / 1000) || item.secs || 0,
      _id: id,
    };
  } catch {
    const cached = cached_media(media_keys("track", item));
    return {
      ...item,
      image: prefer_img(item.image, cached.image),
      banner: prefer_img(item.banner, cached.banner),
      video: item.video || "",
    };
  }
}

async function enrich_album(item: Entry) {
  try {
    const keys = media_keys("album", item);
    const cached = cached_media(keys);
    const known = spotify_id(item.url, "album");
    let album = known ? await api(`/albums/${known}`).catch(() => null) : null;
    if (!album?.id) album = await search_album(item.name, item.artist);
    if (!album?.id) {
      return {
        ...item,
        image: prefer_img(item.image, cached.image),
      };
    }
    const image = prefer_img(img_big(album.images), cached.image, item.image);
    const id = album.id as string;
    remember_media(media_keys("album", { ...item, _id: id }, id), { image });
    return {
      ...item,
      url: album.external_urls?.spotify || item.url,
      image,
      video: item.video || "",
      _id: id,
    };
  } catch {
    const cached = cached_media(media_keys("album", item));
    return {
      ...item,
      image: prefer_img(item.image, cached.image),
    };
  }
}

const media_store = globalThis as typeof globalThis & {
  music_media_cache?: Map<string, { image: string; banner: string }>;
};

function media_map() {
  if (!media_store.music_media_cache) {
    media_store.music_media_cache = new Map();
  }
  return media_store.music_media_cache;
}

function media_keys(
  kind: "track" | "album",
  item: Entry & { _id?: string },
  id = "",
) {
  const keys: string[] = [];
  if (id) keys.push(`${kind}:${id}`);
  if (item._id) keys.push(`${kind}:${item._id}`);
  const from_url = spotify_id(item.url, kind);
  if (from_url) keys.push(`${kind}:${from_url}`);
  keys.push(`${kind}:${item.name}\0${item.artist}`.toLowerCase());
  return keys;
}

function remember_media(
  keys: string[],
  data: { image?: string; banner?: string },
) {
  const map = media_map();
  const image = prefer_img(data.image);
  const banner = prefer_img(data.banner);
  if (!image && !banner) return;
  for (const k of keys) {
    const prev = map.get(k) || { image: "", banner: "" };
    map.set(k, {
      image: prefer_img(image, prev.image),
      banner: prefer_img(banner, prev.banner),
    });
  }
}

function cached_media(keys: string[]) {
  const map = media_map();
  for (const k of keys) {
    const hit = map.get(k);
    if (hit?.image || hit?.banner) return hit;
  }
  return { image: "", banner: "" };
}

const video_store = globalThis as typeof globalThis & {
  music_video_cache?: Map<string, string>;
};

function video_map() {
  if (!video_store.music_video_cache) {
    video_store.music_video_cache = new Map();
  }
  return video_store.music_video_cache;
}

function video_keys(
  kind: "track" | "album",
  item: Entry & { _id?: string },
  id = "",
) {
  const keys: string[] = [];
  if (id) keys.push(`${kind}:${id}`);
  if (item._id) keys.push(`${kind}:${item._id}`);
  const from_url = spotify_id(item.url, kind);
  if (from_url) keys.push(`${kind}:${from_url}`);
  keys.push(`${kind}:${item.name}\0${item.artist}`.toLowerCase());
  return keys;
}

function remember_video(keys: string[], video: string) {
  if (!video) return;
  const map = video_map();
  for (const k of keys) map.set(k, video);
}

function cached_video(keys: string[]) {
  const map = video_map();
  for (const k of keys) {
    const hit = map.get(k);
    if (hit) return hit;
  }
  return "";
}

function keep_videos(next: Entry[], prev: Entry[]) {
  const map = new Map<string, string>();
  for (const p of prev) {
    if (!p.video) continue;
    map.set(`${p.name}\0${p.artist}`.toLowerCase(), p.video);
    const id = spotify_id(p.url, "album") || spotify_id(p.url, "track");
    if (id) map.set(id, p.video);
  }
  return next.map((item) => {
    if (item.video) return item;
    const id = spotify_id(item.url, "album") || spotify_id(item.url, "track");
    const video =
      (id && map.get(id)) ||
      map.get(`${item.name}\0${item.artist}`.toLowerCase()) ||
      "";
    return video ? { ...item, video } : item;
  });
}

function keep_images(next: Entry[], prev: Entry[]) {
  const map = new Map<
    string,
    { image: string; banner: string; album: string; year: number; secs: number }
  >();
  for (const p of prev) {
    const row = {
      image: p.image || "",
      banner: p.banner || "",
      album: p.album || "",
      year: p.year || 0,
      secs: p.secs || 0,
    };
    if (!row.image && !row.banner && !row.album && !row.year && !row.secs) continue;
    map.set(`${p.name}\0${p.artist}`.toLowerCase(), row);
    const id = spotify_id(p.url, "album") || spotify_id(p.url, "track");
    if (id) map.set(id, row);
  }
  return next.map((item) => {
    const id = spotify_id(item.url, "album") || spotify_id(item.url, "track");
    const hit =
      (id && map.get(id)) ||
      map.get(`${item.name}\0${item.artist}`.toLowerCase());
    if (!hit) return item;
    return {
      ...item,
      image: prefer_img(item.image, hit.image),
      banner: prefer_img(item.banner, hit.banner) || item.banner,
      album: item.album || hit.album || "",
      year: item.year || hit.year || 0,
      secs: item.secs || hit.secs || 0,
    };
  });
}

async function attach_video(
  item: Entry & { _id?: string },
  kind: "track" | "album",
): Promise<Entry> {
  const strip = (video: string): Entry => {
    const { _id, ...rest } = item;
    void _id;
    return { ...rest, video };
  };

  try {
    if (kind === "track") {
      const id =
        item._id ||
        spotify_id(item.url, "track") ||
        (await search_track(item.name, item.artist))?.id ||
        "";
      const keys = video_keys(kind, item, id);
      if (item.video) {
        remember_video(keys, item.video);
        return strip(item.video);
      }
      const hit = cached_video(keys);
      if (hit) return strip(hit);
      const video = id ? await track_video(id) : "";
      if (video) remember_video(keys, video);
      return strip(video || cached_video(keys) || "");
    }

    const album_id =
      item._id ||
      spotify_id(item.url, "album") ||
      (await search_album(item.name, item.artist))?.id ||
      "";
    const keys = video_keys(kind, item, album_id);
    if (item.video) {
      remember_video(keys, item.video);
      return strip(item.video);
    }
    const hit = cached_video(keys);
    if (hit) return strip(hit);
    if (!album_id) return strip(cached_video(keys) || "");

    const tracks = await api(`/albums/${album_id}/tracks?limit=10&market=US`);
    let video = "";
    for (const t of tracks?.items || []) {
      if (!t?.id) continue;
      video = await track_video(t.id);
      if (video) break;
    }
    if (video) remember_video(keys, video);
    return strip(video || cached_video(keys) || "");
  } catch {
    const keys = video_keys(kind, item);
    return strip(item.video || cached_video(keys) || "");
  }
}

async function map_pool<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
) {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  const n = Math.min(size, Math.max(items.length, 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

async function enrich_list(
  items: Entry[],
  kind: "track" | "album",
  videos = false,
) {
  const images = await map_pool(items, 8, (item) =>
    kind === "album" ? enrich_album(item) : enrich_track(item),
  );
  if (!videos) {
    return images.map((item) => {
      const { _id, ...rest } = item as Entry & { _id?: string };
      void _id;
      return rest;
    });
  }
  return map_pool(images, 5, (item) =>
    attach_video(item as Entry & { _id?: string }, kind),
  );
}

const LFM_KEY = process.env.LASTFM_API_KEY!;
const LFM_USER = process.env.LASTFM_USER!;
const LFM_ALBUMS = 20;
const LFM_TRACKS = 16;
const LFM_ARTISTS = 52;
const LFM_FETCH = "100";
const LFM_LOVED_FETCH = "1000";

function lfm_period() {
  const raw = (process.env.LASTFM_PERIOD || "").trim().toLowerCase();
  if (raw === "1m") return "1month";
  if (raw === "1y") return "12month";
  return "overall";
}

function norm(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function exclude_names() {
  return (process.env.EXCLUDE || "")
    .split(",")
    .map((s) => norm(s))
    .filter(Boolean);
}

function artist_parts(artist: string) {
  return norm(artist)
    .split(/[,&/]| feat\.? | ft\.? | featuring /g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function is_excluded(name: string, artist = "") {
  const list = exclude_names();
  if (!list.length) return false;
  const n = norm(name);
  const a = norm(artist);
  const parts = a ? artist_parts(artist) : [];
  return list.some(
    (x) => x === n || (a !== "" && x === a) || parts.some((p) => p === x),
  );
}

function take_entries(items: Entry[], limit = Infinity) {
  const out: Entry[] = [];
  for (const item of items) {
    if (out.length >= limit) break;
    if (is_excluded(item.name, item.artist)) continue;
    out.push(item);
  }
  return out;
}

function scrub_stats(stats: Stats): Stats {
  return {
    ...stats,
    tracks: stats.tracks.filter((t) => !is_excluded(t.name, t.artist)),
    albums: stats.albums.filter((t) => !is_excluded(t.name, t.artist)),
    loved: stats.loved.filter((t) => !is_excluded(t.name, t.artist)),
    artists: stats.artists.filter(
      (t) => !is_excluded(t.name, t.artist),
    ),
    all_albums: (stats.all_albums || []).filter(
      (t) => !is_excluded(t.name, t.artist),
    ),
  };
}

type Entry = {
  name: string;
  artist: string;
  url: string;
  image: string;
  banner?: string;
  video: string;
  plays: number;
  album?: string;
  year?: number;
  secs?: number;
};

type Artist = {
  name: string;
  artist: string;
  url: string;
  image: string;
  banner: string;
  video: string;
  plays: number;
};

async function lfm(method: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    method,
    user: LFM_USER,
    api_key: LFM_KEY,
    format: "json",
    ...extra,
  });
  const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
  if (!res.ok) throw new Error("lastfm");
  return res.json();
}

function lfm_img(items: { image?: { "#text": string; size: string }[] }) {
  const list = items.image || [];
  const pick = list.find((i) => i.size === "extralarge") || list.at(-1);
  const url = pick?.["#text"] || "";
  if (url.includes("2a96cbd8b46e442fc41c2b86b821562f")) return "";
  return url;
}

function lfm_entry(
  raw: {
    name: string;
    url: string;
    playcount?: string;
    artist?: { name?: string; "#text"?: string };
    image?: { "#text": string; size: string }[];
  },
  artist_fallback = "",
): Entry {
  return {
    name: raw.name,
    artist:
      raw.artist?.name || raw.artist?.["#text"] || artist_fallback || raw.name,
    url: raw.url,
    image: lfm_img(raw),
    video: "",
    plays: Number(raw.playcount || 0),
  };
}

function lfm_list<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

async function get_tracks() {
  const data = await lfm("user.gettoptracks", {
    period: lfm_period(),
    limit: LFM_FETCH,
  });
  return take_entries(
    lfm_list(data.toptracks?.track).map((t) => lfm_entry(t)),
    LFM_TRACKS,
  );
}

async function get_albums() {
  const data = await lfm("user.gettopalbums", {
    period: lfm_period(),
    limit: LFM_FETCH,
  });
  return take_entries(
    lfm_list(data.topalbums?.album).map((t) => lfm_entry(t)),
    LFM_ALBUMS,
  );
}

async function get_all_albums() {
  const data = await lfm("user.gettopalbums", {
    period: "overall",
    limit: LFM_FETCH,
  });
  return take_entries(
    lfm_list(data.topalbums?.album).map((t) => lfm_entry(t)),
    6,
  );
}

async function get_artists(period = "overall") {
  const data = await lfm("user.gettopartists", {
    period,
    limit: LFM_FETCH,
  });
  const out: Artist[] = [];
  for (const t of lfm_list(data.topartists?.artist)) {
    if (out.length >= LFM_ARTISTS) break;
    const e = lfm_entry(t, (t as { name: string }).name);
    if (is_excluded(e.name, e.artist)) continue;
    out.push({
      name: e.name,
      artist: e.artist,
      url: e.url,
      image: e.image,
      banner: "",
      video: "",
      plays: e.plays,
    });
  }
  return out;
}

async function get_loved() {
  const data = await lfm("user.getlovedtracks", { limit: LFM_LOVED_FETCH });
  return take_entries(lfm_list(data.lovedtracks?.track).map((t) => lfm_entry(t)));
}

async function get_plays() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const from = String(Math.floor(start.getTime() / 1000));

  const [info, recent] = await Promise.all([
    lfm("user.getInfo"),
    lfm("user.getrecenttracks", { from, limit: "1" }),
  ]);

  return {
    total: Number(info.user?.playcount || 0),
    month: Number(recent.recenttracks?.["@attr"]?.total || 0),
    artists: Number(info.user?.artist_count || 0),
    albums: Number(info.user?.album_count || 0),
    tracks: Number(info.user?.track_count || 0),
  };
}

type HistoryPoint = {
  from: number;
  to: number;
  scrobbles: number;
  artists: number;
  albums: number;
  tracks: number;
};

function sample_weeks<T>(items: T[], max = 40): T[] {
  if (items.length <= max) return items;
  const out: T[] = [];
  const last = items.length - 1;
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i * last) / (max - 1));
    if (!out.length || out[out.length - 1] !== items[idx]) out.push(items[idx]);
  }
  return out;
}

async function week_point(from: number, to: number): Promise<HistoryPoint> {
  const f = String(from);
  const t = String(to);
  const [scrob, artists, albums, tracks] = await Promise.all([
    lfm("user.getrecenttracks", { from: f, to: t, limit: "1" }),
    lfm("user.getWeeklyArtistChart", { from: f, to: t }),
    lfm("user.getWeeklyAlbumChart", { from: f, to: t }),
    lfm("user.getWeeklyTrackChart", { from: f, to: t }),
  ]);
  return {
    from,
    to,
    scrobbles: Number(scrob.recenttracks?.["@attr"]?.total || 0),
    artists: lfm_list(artists.weeklyartistchart?.artist).length,
    albums: lfm_list(albums.weeklyalbumchart?.album).length,
    tracks: lfm_list(tracks.weeklytrackchart?.track).length,
  };
}

async function get_history(): Promise<HistoryPoint[]> {
  try {
    const [list, info] = await Promise.all([
      lfm("user.getWeeklyChartList"),
      lfm("user.getInfo"),
    ]);
    const since = Number(
      info.user?.registered?.unixtime ||
        info.user?.registered?.["#text"] ||
        0,
    );
    const weeks = lfm_list(
      list.weeklychartlist?.chart as { from: string; to: string }[] | undefined,
    )
      .map((w) => ({ from: Number(w.from), to: Number(w.to) }))
      .filter(
        (w) =>
          w.from > 0 &&
          w.to > w.from &&
          (!since || w.to >= since),
      )
      .sort((a, b) => a.from - b.from);
    if (!weeks.length) return [];
    const points = sample_weeks(weeks, 28);
    const rows = await map_pool(points, 4, (w) => week_point(w.from, w.to));
    let start = 0;
    while (start < rows.length - 1 && !rows[start].scrobbles) start++;
    return rows.slice(start);
  } catch {
    return [];
  }
}

async function get_stats() {
  const [plays, tracks, albums, loved, artists, all_albums, history] =
    await Promise.all([
      get_plays(),
      get_tracks(),
      get_albums(),
      get_loved(),
      get_artists(),
      get_all_albums(),
      get_history(),
    ]);

  const art = new Map<string, string>();
  for (const a of albums) {
    if (!a.image || art.has(a.artist)) continue;
    art.set(a.artist, a.image);
  }

  const fill = (items: Entry[]) =>
    items.map((t) =>
      t.image ? t : { ...t, image: art.get(t.artist) || "" },
    );

  return {
    plays,
    tracks: fill(tracks),
    albums,
    artists: artists.slice(0, 7),
    all_albums,
    history,
    loved: fill(loved),
  };
}

type Stats = {
  plays: {
    total: number;
    month: number;
    artists: number;
    albums: number;
    tracks: number;
  };
  tracks: Entry[];
  albums: Entry[];
  artists: Artist[];
  all_albums: Entry[];
  history: HistoryPoint[];
  loved: Entry[];
};

const ONE_MIN = 60 * 1000;

const store = globalThis as typeof globalThis & {
  music_stats_cache?: Stats | null;
  music_stats_load?: Promise<Stats> | null;
  music_stats_timer?: ReturnType<typeof setInterval>;
};

async function fetch_stats(): Promise<Stats> {
  const raw = await get_stats();
  const [tracks, albums, loved, artists, all_albums] = await Promise.all([
    enrich_list(raw.tracks, "track", true),
    enrich_list(raw.albums, "album", true),
    enrich_list(raw.loved, "track", true),
    map_pool(raw.artists, 3, enrich_artist),
    enrich_list(raw.all_albums, "album", true),
  ]);

  const art_img = new Map<string, string>();
  for (const list of [albums, all_albums, tracks]) {
    for (const item of list) {
      if (!item.image) continue;
      const key = first_artist(item.artist).toLowerCase();
      if (!art_img.has(key)) art_img.set(key, item.image);
      art_img.set(item.artist.toLowerCase(), item.image);
    }
  }
  const filled = artists.map((a) =>
    a.image
      ? a
      : {
          ...a,
          image:
            art_img.get(a.name.toLowerCase()) ||
            art_img.get(norm_artist(a.name)) ||
            "",
        },
  );

  return {
    ...raw,
    artists: filled,
    all_albums,
    albums,
    tracks,
    loved,
  };
}

async function reload_stats(): Promise<Stats> {
  const prev = store.music_stats_cache;
  const next = await fetch_stats();
  if (prev) {
    next.albums = keep_images(keep_videos(next.albums, prev.albums), prev.albums);
    next.tracks = keep_videos(keep_images(next.tracks, prev.tracks), prev.tracks);
    next.loved = keep_videos(keep_images(next.loved, prev.loved), prev.loved);
    next.all_albums = keep_videos(
      keep_images(next.all_albums, prev.all_albums || []),
      prev.all_albums || [],
    );
    next.artists = next.artists.map((a) => {
      const p = prev.artists.find((x) => x.name === a.name);
      return p
        ? {
            ...a,
            image: a.image || p.image,
            banner: a.banner || p.banner,
            video: a.video || p.video,
          }
        : a;
    });
    if ((!next.history || !next.history.length) && prev.history?.length) {
      next.history = prev.history;
    }
  }
  const clean = scrub_stats(next);
  for (const list of [clean.albums, clean.tracks, clean.loved]) {
    for (const item of list) {
      const kind = spotify_id(item.url, "album") ? "album" : "track";
      remember_media(media_keys(kind, item), {
        image: item.image,
        banner: item.banner,
      });
      if (item.video) {
        remember_video(video_keys(kind, item), item.video);
      }
    }
  }
  store.music_stats_cache = clean;
  sync_top(clean);
  return clean;
}

function kick_reload() {
  if (store.music_stats_load) return store.music_stats_load;
  store.music_stats_load = reload_stats()
    .catch((e) => {
      if (store.music_stats_cache) return scrub_stats(store.music_stats_cache);
      throw e;
    })
    .finally(() => {
      store.music_stats_load = null;
    });
  return store.music_stats_load;
}

async function music_stats(): Promise<Stats> {
  if (store.music_stats_cache) {
    const clean = scrub_stats(store.music_stats_cache);
    store.music_stats_cache = clean;
    return clean;
  }
  return kick_reload();
}

function start_music_cache() {
  if (store.music_stats_timer) return;
  void kick_reload().catch(() => {});
  store.music_stats_timer = setInterval(() => {
    void kick_reload().catch(() => {});
  }, ONE_MIN);
}

start_music_cache();

export {
  get_now,
  get_lyric,
  get_audio,
  load_track,
  track_ready,
  peek_track,
  top_audio,
  fav_audio,
  clear_track,
  line_at,
  next_at,
  word_at,
  next_word,
  live,
  spotify_track,
  spotify_album,
  spotify_kind,
  music_stats,
};
export type { Now, Lyric, Line, Word, SpotifyFav, Entry, Artist, Stats, HistoryPoint };

