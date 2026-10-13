import { useEffect, useRef, useState } from "react";
import { ExternalLink, Music2 } from "lucide-react";
import type { Entry, Lyric } from "@/app/_comps/lib/music";
import {
  get_audio,
  play_track,
  set_volume,
  usePlayer,
} from "@/app/_comps/lib/player";
import { MusicBar } from "@/app/_comps/ui/music/bar";
import { Lyrics, locate } from "@/app/_comps/ui/music/lyrics";
import { MusicPlayer } from "@/app/_comps/ui/music/player";
import { Cover, Empty, Img, pad, track_id } from "@/app/_comps/ui/music/shared";

export function FavFeatured({ t }: { t: Entry }) {
  const art = t.image || t.banner;
  const id = track_id(t.url);
  const vid = useRef<HTMLVideoElement>(null);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [on, setOn] = useState(false);
  const [vol, setVol] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [dur, setDur] = useState(0);
  const player = usePlayer();
  const mine = Boolean(
    id && player.track?.source === "track" && player.track.id === id,
  );
  const playing = mine && player.playing;
  const active = mine;
  const loading = mine && player.loading;
  const lyric = (mine ? player.lyric : null) as Lyric | null;
  const pos = lyric
    ? locate(lyric, player.ms)
    : { line: -1, word: -1, fill: 0 };
  const time = mine ? player.ms / 1000 : 0;
  const show = Boolean(t.video && (on || playing));

  useEffect(() => {
    if (mine) set_volume(vol, muted);
  }, [vol, muted, mine]);

  useEffect(() => {
    if (!mine) {
      setDur(0);
      return;
    }
    const a = get_audio();
    if (!a) return;
    const sync = () => setDur(Number.isFinite(a.duration) ? a.duration : 0);
    sync();
    a.addEventListener("loadedmetadata", sync);
    a.addEventListener("durationchange", sync);
    return () => {
      a.removeEventListener("loadedmetadata", sync);
      a.removeEventListener("durationchange", sync);
    };
  }, [mine, id]);

  useEffect(() => {
    if (!t.video) return;
    const v = vid.current;
    if (!v) return;
    if (playing || on) {
      void v.play().catch(() => {});
      return;
    }
    v.pause();
    v.currentTime = 0;
  }, [playing, on, t.video]);

  function toggle() {
    if (!id) return;
    void play_track({
      id,
      name: t.name,
      artist: t.artist || "",
      image: t.image || art || "",
      url: t.url || "",
    });
  }

  function enter() {
    if (!t.video) return;
    wait.current = setTimeout(() => setOn(true), 200);
  }

  function leave() {
    if (wait.current) {
      clearTimeout(wait.current);
      wait.current = null;
    }
    setOn(false);
  }

  return (
    <div
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      className="rise group relative isolate h-[340px] overflow-hidden rounded-2xl border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.02] shadow-[inset_0_1px_0_#f7f7f708,0_12px_28px_-18px_#000000] transition-[border-color] duration-300 hover:border-[var(--white)]/[0.16]"
    >
      <div aria-hidden="true" className="absolute inset-0">
        {art && !show ? (
          <div className="h-full w-full opacity-50">
            <Img
              src={art}
              className="drift h-full w-full object-cover object-center"
            />
          </div>
        ) : null}
        {t.video ? (
          <video
            ref={vid}
            src={t.video}
            muted
            loop
            playsInline
            preload="auto"
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
              show ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,#171717f5_0%,#17171799_45%,#17171755_100%)]"
      />

      <a
        href={t.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${t.name}`}
        className="absolute top-5 right-5 z-[3] text-[var(--white)]/70 outline-none transition-colors duration-200 hover:text-[var(--white)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50 md:top-6 md:right-6"
      >
        <ExternalLink className="h-6 w-6" strokeWidth={2} />
      </a>

      <div className="pointer-events-none relative z-[2] flex h-full w-full flex-col justify-between p-7 md:p-8">
        <div className="pr-10">
          <h2
            className="rise max-w-[20ch] text-[44px] leading-[0.95] font-black tracking-[-0.035em] md:text-[64px]"
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
              <span className="text-[13px] font-medium text-[var(--white)]/45">{t.album}</span>
            ) : null}
          </p>
        </div>

        <div className="rise relative w-full" style={{ animationDelay: "220ms" }}>
          {active && lyric ? (
            <div className="absolute right-0 bottom-[calc(100%+18px)] w-[min(46ch,70vw)]">
              <Lyrics lyric={lyric} line={pos.line} word={pos.word} fill={pos.fill} />
            </div>
          ) : null}

          {id ? (
            <div className="pointer-events-auto flex w-full items-end gap-5 md:gap-6">
              <div className="relative shrink-0 pl-5">
                <MusicPlayer
                  image={t.image}
                  playing={playing}
                  loading={loading}
                  onToggle={toggle}
                />
              </div>
              <MusicBar
                mine={mine}
                playing={playing}
                time={time}
                dur={dur}
                vol={vol}
                muted={muted}
                onToggle={toggle}
                onVol={setVol}
                onMuted={setMuted}
              />
            </div>
          ) : (
            <div className="flex w-full items-end justify-between gap-6">
              <p className="text-[13px] text-[var(--white)]/40">no preview for this one</p>
              <Cover src={t.image} className="hidden h-20 w-20 rounded-lg sm:block" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FavTile({
  t,
  n,
  i,
  onPick,
}: {
  t: Entry;
  n: number;
  i: number;
  onPick: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  function enter() {
    const v = ref.current;
    if (!v) return;
    void v.play().catch(() => {});
  }

  function leave() {
    const v = ref.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  }

  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      className="rise group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-2xl border border-[var(--white)]/[0.1] bg-[var(--white)]/[0.03] shadow-[0_1px_0_#f7f7f70a_inset,0_10px_30px_-12px_#000000cc] outline-none transition-[box-shadow,border-color] duration-300 ease-out hover:border-[var(--white)]/[0.22] hover:shadow-[0_1px_0_#f7f7f714_inset,0_0_0_1px_#f7f7f71a,0_0_32px_#000000bb,0_22px_50px_-14px_#000000] focus-visible:border-[var(--white)]/[0.22] focus-visible:shadow-[0_1px_0_#f7f7f714_inset,0_0_0_1px_#f7f7f71a,0_0_32px_#000000bb,0_22px_50px_-14px_#000000]"
      style={{ animationDelay: `${160 + i * 30}ms` }}
    >
      {t.image ? (
        <Img
          src={t.image}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            t.video ? "group-hover:opacity-0 group-focus-visible:opacity-0" : ""
          }`}
        />
      ) : (
        <Music2
          className="absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-[var(--white)]/20"
          strokeWidth={1.5}
        />
      )}
      {t.video ? (
        <video
          ref={ref}
          src={t.video}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_#f7f7f714,inset_0_0_40px_#00000080,inset_0_-30px_50px_-20px_#000000a6] transition-[box-shadow] duration-300 group-hover:shadow-[inset_0_0_0_1px_#f7f7f71f,inset_0_0_60px_#000000a6,inset_0_-30px_50px_-20px_#000000cc]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,#f7f7f71f_0%,transparent_38%)] opacity-70 transition-opacity duration-300 group-hover:opacity-30"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[#171717]/0 transition-colors duration-300 group-hover:bg-[#171717]/55 group-focus-visible:bg-[#171717]/55"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        <p className="text-[12px] tabular-nums text-[var(--white)]/50">{pad(n)}</p>
        <p className="mt-2 line-clamp-2 text-[20px] leading-snug font-black tracking-tight">{t.name}</p>
        <p className="mt-2.5 text-[15px] text-[var(--white)]/75">{t.artist}</p>
      </div>
    </button>
  );
}

export function Favourites({ items }: { items: Entry[] }) {
  const [pick, setPick] = useState(() =>
    items.length ? Math.floor(Math.random() * items.length) : 0,
  );

  if (!items.length) return <Empty text="no loved tracks yet" />;

  const idx = items[pick] ? pick : 0;
  const featured = items[idx];
  const rest = items.filter((_, i) => i !== idx);

  return (
    <div className="space-y-8">
      <FavFeatured key={`${featured.name}-${featured.artist}`} t={featured} />

      {rest.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {rest.map((t, i) => (
            <FavTile
              key={`${t.name}-${t.artist}`}
              t={t}
              n={i + 1}
              i={i}
              onPick={() => setPick(items.indexOf(t))}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
