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

type Lyric = {
  id: string;
  name: string;
  artist: string;
  sync: "none" | "line" | "word";
  lines: Line[];
};

type RichWord = { c: string; o: number };
type RichLine = { ts: number; te: number; x?: string; l: RichWord[] };

const APP = "mac-ios-v2.0";
const BASE = "https://apic-appmobile.musixmatch.com/ws/1.1";
const HEADERS = {
  "x-mxm-app-version": "10.1.1",
  "X-User-Agent":
    "Musixmatch/2025120901 CFNetwork/3860.300.31 Darwin/25.2.0",
  Accept: "application/json",
  "User-Agent":
    "Musixmatch/2025120901 CFNetwork/3860.300.31 Darwin/25.2.0",
};

let cached = "";
let cached_at = 0;

async function token() {
  if (cached && Date.now() - cached_at < 50 * 60 * 1000) return cached;
  const res = await fetch(`${BASE}/token.get?app_id=${APP}`, {
    headers: HEADERS,
  });
  if (!res.ok) return "";
  const data = await res.json();
  const value = data?.message?.body?.user_token as string;
  if (!value) return "";
  cached = value;
  cached_at = Date.now();
  return cached;
}

async function api(path: string, params: Record<string, string>) {
  const usertoken = await token();
  if (!usertoken) return null;
  const q = new URLSearchParams({
    format: "json",
    app_id: APP,
    usertoken,
    ...params,
  });
  const res = await fetch(`${BASE}/${path}?${q}`, { headers: HEADERS });
  if (!res.ok) return null;
  return res.json();
}

function parse_rich(
  body: string | RichLine[],
  id: string,
  name: string,
  artist: string,
): Lyric | null {
  let raw: RichLine[];
  try {
    raw = typeof body === "string" ? JSON.parse(body) : body;
  } catch {
    return null;
  }
  if (!Array.isArray(raw) || !raw.length) return null;

  const lines: Line[] = raw.map((line, i) => {
    const start = Math.round(Number(line.ts) * 1000);
    const end = Math.round(
      (Number(line.te) || Number(raw[i + 1]?.ts) || Number(line.ts)) * 1000,
    );
    const words: Word[] = (line.l || []).map((w, wi, arr) => {
      const w_start = Math.round((Number(line.ts) + Number(w.o)) * 1000);
      const w_end =
        wi + 1 < arr.length
          ? Math.round((Number(line.ts) + Number(arr[wi + 1].o)) * 1000)
          : end;
      return { start: w_start, end: w_end, text: w.c };
    });
    return {
      start,
      end,
      text: line.x || words.map((w) => w.text).join(""),
      words,
    };
  });

  if (!lines.some((l) => l.words.length)) return null;
  return { id, name, artist, sync: "word", lines };
}

async function get_richsync(
  id: string,
  meta: { name?: string; artist?: string; isrc?: string } = {},
): Promise<Lyric | null> {
  const data = await api("macro.subtitles.get", {
    namespace: "lyrics_richsynched",
    subtitle_format: "mxm",
    q_track: meta.name || "",
    q_artist: meta.artist || "",
    track_spotify_id: id,
    optional_calls: "track.richsync",
    richsync_compact_type: "words",
    ...(meta.isrc ? { track_isrc: meta.isrc } : {}),
  });

  const calls = data?.message?.body?.macro_calls;
  if (!calls) return null;

  const track = calls["matcher.track.get"]?.message?.body?.track;
  const rich = calls["track.richsync.get"];
  const status = rich?.message?.header?.status_code;
  const body = rich?.message?.body?.richsync?.richsync_body;
  if (Number(status) !== 200 || body == null || body === "") {
    return null;
  }

  return parse_rich(
    body,
    id,
    meta.name || track?.track_name || "",
    meta.artist || track?.artist_name || "",
  );
}

export { get_richsync };
export type { Lyric, Line, Word };
