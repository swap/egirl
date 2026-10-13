import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Music2, Pause, Play } from "lucide-react";
import {
  bind_audio,
  get_audio,
  keep_alive,
  sync_playing,
  toggle,
  usePlayer,
  type Lyric,
} from "@/app/_comps/lib/player";

function useAlbumColors(src: string) {
  const [colors, setColors] = useState<[string, string]>(["#f7f7f7", "#b8b8b8"]);

  useEffect(() => {
    if (!src) {
      setColors(["#f7f7f7", "#b8b8b8"]);
      return;
    }
    let gone = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 200) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max < 40 || min > 230) continue;
          const key = `${r >> 4},${g >> 4},${b >> 4}`;
          const hit = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
          hit.n += 1;
          hit.r += r;
          hit.g += g;
          hit.b += b;
          buckets.set(key, hit);
        }
        const ranked = [...buckets.values()].sort((x, y) => y.n - x.n);
        if (!ranked.length) return;
        const to = (c: { n: number; r: number; g: number; b: number }) => {
          const r = Math.round(c.r / c.n);
          const g = Math.round(c.g / c.n);
          const b = Math.round(c.b / c.n);
          return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
        };
        if (!gone) setColors([to(ranked[0]), to(ranked[1] || ranked[0])]);
      } catch {}
    };
    img.onerror = () => {};
    img.src = src;
    return () => {
      gone = true;
    };
  }, [src]);

  return colors;
}

function usePath() {
  const [path, setPath] = useState(() =>
    typeof location === "undefined"
      ? "/"
      : location.pathname.replace(/\/+$/, "") || "/",
  );

  useEffect(() => {
    const read = () => location.pathname.replace(/\/+$/, "") || "/";
    const sync = () => {
      setPath(read());
      sync_playing();
    };
    sync();
    document.addEventListener("astro:page-load", sync);
    document.addEventListener("astro:after-swap", sync);
    window.addEventListener("popstate", sync);
    const iv = setInterval(() => {
      const next = read();
      setPath((p) => (p === next ? p : next));
      sync_playing();
    }, 250);
    return () => {
      document.removeEventListener("astro:page-load", sync);
      document.removeEventListener("astro:after-swap", sync);
      window.removeEventListener("popstate", sync);
      clearInterval(iv);
    };
  }, []);

  return path;
}

function locate(lyric: Lyric, ms: number) {
  let line = -1;
  for (let i = lyric.lines.length - 1; i >= 0; i--) {
    if (ms >= lyric.lines[i].start) {
      line = i;
      break;
    }
  }
  if (line < 0) return { line: -1, word: -1, fill: 0 };

  const cur = lyric.lines[line];
  const next_line = lyric.lines[line + 1];
  const line_end =
    cur.end > cur.start ? cur.end : next_line?.start || cur.start + 1;
  const words = cur.words;

  if (!words.length) {
    const fill = Math.min(
      1,
      Math.max(0, (ms - cur.start) / Math.max(1, line_end - cur.start)),
    );
    return { line, word: -1, fill };
  }

  let word = -1;
  let fill = 0;
  for (let i = 0; i < words.length; i++) {
    if (!words[i].text.trim() || ms < words[i].start) continue;
    word = i;
    let end = words[i].end;
    for (let j = i + 1; j < words.length; j++) {
      if (!words[j].text.trim()) continue;
      end = words[j].start;
      break;
    }
    if (!(end > words[i].start)) {
      end = line_end > words[i].start ? line_end : words[i].start + 1;
    }
    fill =
      ms >= end
        ? 1
        : Math.min(
            1,
            Math.max(0, (ms - words[i].start) / (end - words[i].start)),
          );
  }

  if (word >= 0 && ms >= line_end) fill = 1;
  return { line, word, fill };
}

function LiveLyrics({
  lyric,
  ms,
  align = "left",
}: {
  lyric: Lyric;
  ms: number;
  align?: "left" | "right";
}) {
  const { line, word, fill } = locate(lyric, ms);
  const prev = lyric.lines[line - 1];
  const cur = lyric.lines[line];

  function paint(pct: number, text: string) {
    return (
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage: `linear-gradient(90deg, var(--white) ${pct}%, color-mix(in srgb, var(--white) 32%, transparent) ${pct}%)`,
          WebkitBackgroundClip: "text",
        }}
      >
        {text}
      </span>
    );
  }

  if (line < 0 && !prev) return null;

  return (
    <div className={`w-full min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <p
        className={`truncate text-[9px] leading-3 transition-opacity duration-300 sm:text-[10px] sm:leading-3.5 ${
          prev ? "text-[var(--white)]/30" : "text-transparent"
        }`}
      >
        {prev?.text || "\u00a0"}
      </p>
      <p className="mt-0.5 truncate text-[12px] leading-4 font-medium tracking-[-0.01em] sm:text-[13px] sm:leading-5">
        {!cur ? (
          <span className="text-[var(--white)]/35">…</span>
        ) : cur.words.length ? (
          cur.words.map((w, i) => {
            const done = i < word;
            const on = i === word;
            const pct = done ? 100 : on ? fill * 100 : 0;
            return <span key={i}>{paint(pct, w.text)}</span>;
          })
        ) : (
          paint(fill * 100, cur.text)
        )}
      </p>
    </div>
  );
}

function Disk({
  image,
  playing,
  loading,
  spin,
  show,
}: {
  image?: string;
  playing: boolean;
  loading: boolean;
  spin: boolean;
  show: boolean;
}) {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Pause" : "Play"}
      className="group/art relative h-9 w-9 shrink-0 cursor-pointer rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50"
    >
      <span
        className="relative block h-9 w-9 overflow-hidden rounded-full border border-[var(--white)]/[0.14] shadow-[0_8px_20px_-10px_#000] motion-safe:animate-[spin_7s_linear_infinite]"
        style={{ animationPlayState: spin ? "running" : "paused" }}
      >
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="block h-full w-full bg-[var(--white)]/[0.06]" />
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-[repeating-radial-gradient(circle,transparent_0_42%,#17171755_42%,#17171788_46%,transparent_46%)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[36%] rounded-full border border-[var(--white)]/[0.2] bg-[#171717]/55"
        />
        <span
          className={`absolute inset-0 flex items-center justify-center rounded-full bg-[#171717]/45 text-[var(--white)] transition-opacity duration-200 ${
            show
              ? "opacity-100"
              : "opacity-0 group-hover/art:opacity-100 group-focus-visible/art:opacity-100"
          }`}
        >
          {loading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--white)]/30 border-t-[var(--white)]" />
          ) : playing ? (
            <Pause className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" strokeWidth={0} />
          )}
        </span>
      </span>
    </button>
  );
}

function Meta({
  label,
  name,
  artist,
  url,
  gradient,
}: {
  label: string;
  name: string;
  artist?: string;
  url?: string;
  gradient: CSSProperties;
}) {
  return (
    <div className="min-w-0 text-left">
      <p className="text-[10px] leading-4 whitespace-nowrap text-[var(--white)]/40">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[12px] leading-4 font-medium">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="outline-none transition-opacity hover:opacity-80"
            style={gradient}
          >
            {name}
          </a>
        ) : (
          <span style={gradient}>{name}</span>
        )}
        {artist ? (
          <span className="font-normal text-[var(--white)]">
            {" "}
            by {artist}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function NowPlaying() {
  const { track, live, lyric, playing, loading, ms } = usePlayer();
  const [a, b] = useAlbumColors(live?.image || "");

  if (!live || track?.source !== "live") return null;

  const gradient = {
    backgroundImage: `linear-gradient(110deg, ${a}, ${b})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  } as CSSProperties;

  return (
    <div className="rise relative ml-auto mt-10 w-full max-w-[22rem] sm:mt-12 sm:max-w-[26rem]">
      <div className="flex w-full items-center justify-end gap-3">
        <Disk
          image={live.image}
          playing={playing}
          loading={loading}
          spin={playing}
          show={loading}
        />
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute right-0 bottom-full mb-1.5 w-full max-w-full overflow-hidden">
            {lyric ? (
              <LiveLyrics lyric={lyric} ms={ms} align="right" />
            ) : (
              <p className="text-right text-[12px] leading-4 tracking-[0.35em] text-[var(--white)]/35 sm:text-[13px]">
                ···
              </p>
            )}
          </div>
          <Meta
            label="Listening to"
            name={live.name}
            artist={live.artist}
            url={live.url}
            gradient={gradient}
          />
        </div>
      </div>
    </div>
  );
}

function FloatPlaying() {
  const { track, playing, loading } = usePlayer();
  const [hover, setHover] = useState(false);
  const el = get_audio();
  const active = Boolean(
    playing || (el && !el.paused && !el.ended),
  );

  useEffect(() => {
    sync_playing();
    const iv = setInterval(sync_playing, 500);
    return () => clearInterval(iv);
  }, []);

  if (!track || track.source !== "live" || !active) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={active ? "Pause" : "Play"}
      className="pointer-events-auto group/float relative block h-11 w-11 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-[2.5%] rounded-full transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
          hover ? "translate-x-4" : ""
        }`}
      >
        <span
          className="relative block h-full w-full rounded-full border border-[var(--white)]/[0.12] bg-[#1a1a1a] shadow-[0_12px_28px_-10px_#000] motion-safe:animate-[spin_7s_linear_infinite]"
          style={{ animationPlayState: active && hover ? "running" : "paused" }}
        >
          <span className="absolute inset-[7%] rounded-full bg-[repeating-radial-gradient(circle,#1c1c1c_0_1.5px,#252525_1.5px_3px)]" />
          <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#f7f7f716_40deg,transparent_95deg,transparent_180deg,#f7f7f70c_225deg,transparent_275deg)]" />
          <span className="absolute inset-[33%] flex items-center justify-center rounded-full border border-[var(--white)]/[0.14] bg-[#171717]">
            <Music2 className="h-[53%] w-[53%] text-[var(--white)]/75" strokeWidth={2} />
          </span>
        </span>
      </span>

      <span
        className={`relative z-[1] block h-11 w-11 overflow-hidden rounded-lg border border-[var(--white)]/[0.12] bg-[#171717] shadow-[0_10px_24px_-14px_#000] transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
          hover ? "-translate-x-1" : ""
        }`}
      >
        {track.image ? (
          <img src={track.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="block h-full w-full bg-[var(--white)]/[0.06]" />
        )}
        <span
          className={`absolute inset-0 flex items-center justify-center bg-[#171717]/50 text-[var(--white)] transition-opacity duration-200 ${
            hover || loading
              ? "opacity-100"
              : "opacity-0 group-focus-visible/float:opacity-100"
          }`}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--white)]/30 border-t-[var(--white)]" />
          ) : active ? (
            <Pause className="h-4 w-4 fill-current" strokeWidth={0} />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" strokeWidth={0} />
          )}
        </span>
      </span>
    </button>
  );
}

function Player() {
  const path = usePath();
  const aud = useRef<HTMLAudioElement>(null);
  const { track, playing } = usePlayer();
  const el = get_audio();
  const active = playing || Boolean(el && !el.paused && !el.ended);
  const home = path === "/";
  const show = !home && track?.source === "live" && active;

  useEffect(() => {
    bind_audio(aud.current);
  });

  useEffect(() => {
    const kick = () => keep_alive();
    document.addEventListener("astro:page-load", kick);
    document.addEventListener("astro:after-swap", kick);
    kick();
    return () => {
      document.removeEventListener("astro:page-load", kick);
      document.removeEventListener("astro:after-swap", kick);
    };
  }, []);

  return (
    <div
      id="music-player-root"
      className={`font-satoshi pointer-events-none fixed top-2 left-2 z-50 sm:top-3 sm:left-3 ${
        show ? "" : "invisible"
      }`}
    >
      <audio
        ref={(node) => {
          aud.current = node;
          if (node) bind_audio(node);
        }}
        preload="auto"
        playsInline
        className="hidden"
      />
      {show ? <FloatPlaying /> : null}
    </div>
  );
}

export { NowPlaying, Player };
