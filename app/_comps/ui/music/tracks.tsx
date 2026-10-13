import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { Entry, Lyric } from "@/app/_comps/lib/music";
import { play_track, usePlayer } from "@/app/_comps/lib/player";
import { Disc } from "@/app/_comps/ui/music/disc";
import { Lyrics, locate } from "@/app/_comps/ui/music/lyrics";
import { Cover, Empty, Img, num, pad, Stat, track_id } from "@/app/_comps/ui/music/shared";

export function Hero({ t }: { t: Entry }) {
  const back = t.banner || t.image;
  const id = track_id(t.url);
  const vid = useRef<HTMLVideoElement>(null);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [on, setOn] = useState(false);
  const player = usePlayer();
  const mine = Boolean(
    id && player.track?.source === "track" && player.track.id === id,
  );
  const playing = mine && player.playing;
  const active = mine;
  const lyric = (mine ? player.lyric : null) as Lyric | null;
  const pos = lyric
    ? locate(lyric, player.ms)
    : { line: -1, word: -1, fill: 0 };

  function toggle() {
    if (!id) return;
    void play_track({
      id,
      name: t.name,
      artist: t.artist || "",
      image: t.image || "",
      url: t.url || "",
    });
  }

  function enter() {
    if (!t.video) return;
    wait.current = setTimeout(() => {
      const v = vid.current;
      if (!v) return;
      void v.play().catch(() => {});
      setOn(true);
    }, 1000);
  }

  function leave() {
    if (wait.current) {
      clearTimeout(wait.current);
      wait.current = null;
    }
    const v = vid.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
    setOn(false);
  }

  return (
    <div
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      className="rise group relative isolate h-[340px] overflow-hidden rounded-2xl border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.02] shadow-[inset_0_1px_0_#f7f7f708,0_12px_28px_-18px_#000000] transition-[border-color] duration-300 hover:border-[var(--white)]/[0.16] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[var(--white)]/50"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60 [mask-image:linear-gradient(to_right,transparent_8%,#000_42%)]"
      >
        {back ? (
          <Img
            src={back}
            className={`drift h-full w-full object-cover object-[center_30%] grayscale transition-opacity duration-500 ${
              on ? "opacity-0" : ""
            }`}
          />
        ) : null}
        {t.video ? (
          <video
            ref={vid}
            src={t.video}
            muted
            loop
            playsInline
            preload="metadata"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              on ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,#171717f0_0%,#17171755_42%,transparent_78%)]"
      />
      <a
        href={t.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`${t.name} by ${t.artist}`}
        className="absolute inset-0 z-[1] outline-none"
      />
      <div className="pointer-events-none relative z-[2] flex h-full flex-col justify-between p-7 md:p-8">
        <div>
          <p className="text-[14px] font-medium text-[var(--white)]/50">#1</p>
          <h2
            className="rise mt-1 max-w-[18ch] text-[44px] leading-[0.95] font-black tracking-[-0.035em] md:text-[64px]"
            style={{ animationDelay: "60ms", animationDuration: "0.8s" }}
          >
            {t.name}
          </h2>
          <p
            className="rise mt-3 flex flex-wrap items-baseline gap-x-2 text-[18px] text-[var(--white)]/70"
            style={{ animationDelay: "140ms" }}
          >
            <span>{t.artist}</span>
            {t.album ? (
              <span className="text-[13px] font-medium text-[var(--white)]/45">
                {t.album}
              </span>
            ) : null}
          </p>
        </div>

        <div
          className="rise flex items-end justify-between gap-6"
          style={{ animationDelay: "220ms" }}
        >
          <Stat value={num(t.plays)} label="scrobbles" />
          <div className={`relative shrink-0 ${id ? "block" : "hidden sm:block"}`}>
            {active && lyric ? (
              <div className="absolute right-0 bottom-[calc(100%+16px)] w-[min(46ch,70vw)]">
                <Lyrics lyric={lyric} line={pos.line} word={pos.word} fill={pos.fill} />
              </div>
            ) : null}
            {id ? (
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? "Pause" : "Play"}
                className="group/art pointer-events-auto relative block h-20 w-20 cursor-pointer rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50"
              >
                <Disc out={playing} spin={playing} />
                <div
                  className={`relative h-20 w-20 transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
                    playing ? "-translate-x-5" : ""
                  }`}
                >
                  <Cover src={t.image} className="h-20 w-20 rounded-lg" />
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded-lg bg-[#171717]/50 text-[var(--white)] transition-opacity duration-200 ${
                      mine && player.loading
                        ? "opacity-100"
                        : "opacity-0 group-hover/art:opacity-100 group-focus-visible/art:opacity-100"
                    }`}
                  >
                    {mine && player.loading ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--white)]/30 border-t-[var(--white)]" />
                    ) : playing ? (
                      <Pause className="h-6 w-6 fill-current" strokeWidth={0} />
                    ) : (
                      <Play className="ml-0.5 h-6 w-6 fill-current" strokeWidth={0} />
                    )}
                  </div>
                </div>
              </button>
            ) : (
              <Cover src={t.image} className="h-20 w-20 rounded-lg" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Row({ t, n, i }: { t: Entry; n: number; i: number }) {
  const vid = useRef<HTMLVideoElement>(null);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [on, setOn] = useState(false);

  function enter() {
    wait.current = setTimeout(() => {
      const v = vid.current;
      if (v) void v.play().catch(() => {});
      setOn(true);
    }, 1000);
  }

  function leave() {
    if (wait.current) {
      clearTimeout(wait.current);
      wait.current = null;
    }
    const v = vid.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
    setOn(false);
  }

  return (
    <li className="rise" style={{ animationDelay: `${120 + i * 38}ms` }}>
      <a
        href={t.url}
        target="_blank"
        rel="noreferrer"
        onMouseEnter={enter}
        onMouseLeave={leave}
        className="group relative grid grid-cols-[28px_44px_minmax(0,1fr)_auto] items-center gap-x-4 overflow-hidden rounded-xl border-b border-[var(--white)]/[0.06] px-3 py-3 outline-none transition-colors duration-200 hover:bg-[var(--white)]/[0.025] focus-visible:bg-[var(--white)]/[0.04] md:grid-cols-[36px_44px_minmax(0,1fr)_auto] md:gap-x-6"
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
            on ? "opacity-100" : "opacity-0"
          }`}
        >
          {t.video ? (
            <video
              ref={vid}
              src={t.video}
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full scale-105 object-cover blur-[2px]"
            />
          ) : t.image ? (
            <img
              src={t.image}
              alt=""
              className="absolute inset-0 h-full w-full scale-105 object-cover blur-[2px]"
            />
          ) : null}
          <div className="absolute inset-0 bg-[#171717]/55" />
        </div>

        <span className="relative z-[1] text-[16px] tabular-nums text-[var(--white)]/40 transition-colors duration-200 group-hover:text-[var(--white)]">
          {pad(n)}
        </span>
        <Cover src={t.image} className="relative z-[1] h-11 w-11 rounded-md" />
        <div className="relative z-[1] min-w-0">
          <p className="truncate text-[15px] font-medium">{t.name}</p>
          <p className="mt-0.5 truncate text-[13px] text-[var(--white)]/50">{t.artist}</p>
        </div>
        <div className="relative z-[1] text-right">
          <p className="text-[15px] font-semibold tabular-nums">{num(t.plays)}</p>
          <p className="mt-0.5 text-[12px] text-[var(--white)]/40">scrobbles</p>
        </div>
      </a>
    </li>
  );
}

export function List({ items, from }: { items: Entry[]; from: number }) {
  return (
    <ul className="border-t border-[var(--white)]/[0.06]">
      {items.map((t, i) => (
        <Row key={`${t.name}-${t.artist}`} t={t} n={from + i} i={i} />
      ))}
    </ul>
  );
}

export function Ranked({ items, hero }: { items: Entry[]; hero: boolean }) {
  const top = hero ? items[0] : null;
  const rows = hero ? items.slice(1) : items;

  if (!items.length) return <Empty />;

  return (
    <>
      {top ? <Hero t={top} /> : null}
      {rows.length ? (
        <div className={top ? "mt-6" : ""}>
          <List items={rows} from={hero ? 2 : 1} />
        </div>
      ) : null}
    </>
  );
}
