import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Artist, HistoryPoint, Stats } from "@/app/_comps/lib/music";
import { Seg } from "@/app/_comps/ui/seg";
import { Cover, Img, num, pad } from "@/app/_comps/ui/music/shared";

export const chart_keys = ["scrobbles", "artists", "albums", "tracks"] as const;

export type ChartKey = (typeof chart_keys)[number];

export function Count({ to, delay = 0 }: { to: number; delay?: number }) {
  const [v, setV] = useState(0);

  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    const dur = 1100;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const p = Math.min(1, (now - t0 - delay) / dur);
      if (p >= 0) setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay]);

  return <>{num(v)}</>;
}

export function TopArtist({ a, total }: { a: Artist; total: number }) {
  const back = a.banner || a.image;
  const share = total ? Math.round((a.plays / total) * 1000) / 10 : 0;
  const vid = useRef<HTMLVideoElement>(null);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [on, setOn] = useState(false);

  function enter() {
    if (!a.video) return;
    wait.current = setTimeout(() => {
      const v = vid.current;
      if (!v) return;
      void v.play().catch(() => {});
      setOn(true);
    }, 400);
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
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      className="rise group relative isolate block overflow-hidden rounded-2xl border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.02] shadow-[inset_0_1px_0_#f7f7f708,0_12px_28px_-18px_#000000] outline-none transition-[border-color] duration-300 hover:border-[var(--white)]/[0.2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-65 [mask-image:linear-gradient(to_right,transparent_6%,#000_48%)]"
      >
        {back ? (
          <Img
            src={back}
            className={`drift h-full w-full object-cover object-[center_48%] transition-opacity duration-500 ${
              on ? "opacity-0" : ""
            }`}
          />
        ) : null}
        {a.video ? (
          <video
            ref={vid}
            src={a.video}
            muted
            loop
            playsInline
            preload="metadata"
            className={`absolute inset-0 h-full w-full object-cover object-[center_48%] transition-opacity duration-500 ${
              on ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,#171717ee_0%,#17171755_48%,#17171722_100%)]"
      />
      <div className="relative flex min-h-[240px] flex-col justify-between p-6 md:min-h-[260px] md:p-7">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[13px] font-medium text-[var(--white)]/50"># top artist of all time</p>
            <h2
              className="rise mt-1 max-w-[16ch] text-[36px] leading-[0.95] font-black tracking-[-0.03em] md:text-[48px]"
              style={{ animationDelay: "80ms", animationDuration: "0.8s" }}
            >
              {a.name}
            </h2>
          </div>
          <div className="hidden shrink-0 sm:block">
            <Cover src={a.image} className="h-16 w-16 rounded-full ring-1 ring-[var(--white)]/15" />
          </div>
        </div>
        <div className="rise mt-6 flex items-end justify-between gap-6" style={{ animationDelay: "180ms" }}>
          <div>
            <p className="text-[30px] leading-none font-black tracking-tight tabular-nums">
              <Count to={a.plays} delay={200} />
            </p>
            <p className="mt-1.5 text-[12px] text-[var(--white)]/45">scrobbles</p>
          </div>
          <div className="text-right">
            <p className="text-[17px] font-semibold tracking-tight tabular-nums">{share}%</p>
            <p className="mt-0.5 text-[12px] text-[var(--white)]/40">of top artists</p>
          </div>
        </div>
      </div>
    </a>
  );
}

export function StatRow({
  n,
  i,
  href,
  image,
  back,
  video = "",
  name,
  sub,
  value,
  round,
}: {
  n: number;
  i: number;
  href: string;
  image: string;
  back: string;
  video?: string;
  name: string;
  sub?: string;
  value: number;
  round?: boolean;
}) {
  const vid = useRef<HTMLVideoElement>(null);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [on, setOn] = useState(false);

  function enter() {
    if (!video) return;
    wait.current = setTimeout(() => {
      const v = vid.current;
      if (!v) return;
      void v.play().catch(() => {});
      setOn(true);
    }, 350);
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
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={enter}
      onMouseLeave={leave}
      className="rise group relative isolate block overflow-hidden rounded-xl border border-[var(--white)]/[0.06] bg-[var(--white)]/[0.02] outline-none transition-[border-color,transform] duration-300 hover:border-[var(--white)]/[0.18] hover:-translate-y-px focus-visible:border-[var(--white)]/[0.3]"
      style={{ animationDelay: `${i * 45}ms` }}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-500 ${
          on ? "opacity-80" : "opacity-45 group-hover:opacity-65"
        }`}
      >
        {back ? (
          <Img
            src={back}
            className={`h-full w-full scale-110 object-cover object-[center_30%] blur-[8px] transition-opacity duration-500 ${
              on ? "opacity-0" : ""
            }`}
          />
        ) : null}
        {video ? (
          <video
            ref={vid}
            src={video}
            muted
            loop
            playsInline
            preload="metadata"
            className={`absolute inset-0 h-full w-full scale-105 object-cover blur-[1px] transition-opacity duration-500 ${
              on ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#171717f2_0%,#171717cc_42%,#17171755_100%)]" />
      </div>
      <div className="relative grid grid-cols-[28px_40px_minmax(0,1fr)_auto] items-center gap-x-3.5 px-3.5 py-2.5 md:grid-cols-[32px_40px_minmax(0,1fr)_auto] md:gap-x-4">
        <span className="text-[13px] tabular-nums text-[var(--white)]/40 transition-colors duration-200 group-hover:text-[var(--white)]">
          {pad(n)}
        </span>
        <Cover src={image} className={`h-10 w-10 ${round ? "rounded-full" : "rounded-md"}`} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{name}</p>
          {sub ? (
            <p className="mt-0.5 truncate text-[12px] text-[var(--white)]/45">{sub}</p>
          ) : null}
        </div>
        <p className="text-right text-[14px] font-semibold tabular-nums text-[var(--white)]/70 transition-colors duration-200 group-hover:text-[var(--white)]">
          {num(value)}
        </p>
      </div>
    </a>
  );
}

export function Panel({
  title,
  sub,
  delay,
  children,
}: {
  title: string;
  sub: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <section
      className="rise rounded-2xl border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.02] p-3 shadow-[inset_0_1px_0_#f7f7f708] md:p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-baseline justify-between px-1.5">
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="text-[12px] text-[var(--white)]/40">{sub}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function chart_label(ms: number) {
  return new Date(ms * 1000).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function tip_label(ms: number) {
  return new Date(ms * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChartTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly {
    value?: number | string | readonly (number | string)[];
    payload?: { from?: number };
  }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const date = point?.payload?.from ? tip_label(point.payload.from) : "";
  return (
    <div className="pointer-events-none rounded-lg border border-[var(--white)]/[0.12] bg-[#171717]/95 px-3 py-2 shadow-[0_12px_40px_-16px_#000000] backdrop-blur-sm">
      <p className="text-[11px] text-[var(--white)]/40">{date}</p>
      <p className="mt-0.5 text-[14px] font-semibold tabular-nums">
        {num(Math.round(Number(point?.value || 0)))}
      </p>
    </div>
  );
}

export function HistoryChart({ history, plays }: { history: HistoryPoint[]; plays: Stats["plays"] }) {
  const [tab, setTab] = useState(0);
  const key = chart_keys[tab];
  const totals: Record<ChartKey, number> = {
    scrobbles: plays.total,
    artists: plays.artists,
    albums: plays.albums,
    tracks: plays.tracks,
  };

  const data = useMemo(
    () =>
      history.map((h) => ({
        label: chart_label(h.from),
        value: h[key],
        from: h.from,
      })),
    [history, key],
  );

  const first = history[0];
  const last = history[history.length - 1];
  const peak = data.reduce(
    (a, b) => (b.value >= a.value ? b : a),
    data[0] || { value: 0, label: "", from: 0 },
  );

  return (
    <div
      className="rise rounded-2xl border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.02] shadow-[inset_0_1px_0_#f7f7f708]"
      style={{ animationDelay: "40ms" }}
    >
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
        <div>
          <p className="text-[13px] text-[var(--white)]/45">listening over time</p>
          <p className="mt-1 text-[34px] leading-none font-black tracking-tight tabular-nums">
            <Count to={totals[key]} delay={80} />
          </p>
          <p className="mt-2 text-[12px] text-[var(--white)]/35">{key} · all time</p>
        </div>
        <Seg
          size="sm"
          items={[...chart_keys]}
          value={tab}
          onChange={setTab}
          className="shrink-0"
        />
      </div>

      <div className="px-3 pb-4 md:px-5 md:pb-5">
        {!history.length ? (
          <div className="flex h-[220px] items-center justify-center text-[13px] text-[var(--white)]/35">
            no weekly history yet
          </div>
        ) : (
          <>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id="hist-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--white)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--white)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    cursor={{ stroke: "rgba(247,247,247,0.12)", strokeWidth: 1 }}
                    content={ChartTip}
                    isAnimationActive={false}
                    animationDuration={0}
                    offset={10}
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ outline: "none", transition: "none", pointerEvents: "none" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name={key}
                    stroke="var(--white)"
                    strokeWidth={2}
                    fill="url(#hist-fill)"
                    isAnimationActive
                    animationDuration={450}
                    animationEasing="ease-out"
                    activeDot={{
                      r: 4,
                      fill: "var(--white)",
                      stroke: "#171717",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {first && last ? (
              <div className="mt-3 flex items-center justify-between gap-4 text-[12px] tabular-nums text-[var(--white)]/40">
                <span>{chart_label(first.from)}</span>
                {peak.value ? (
                  <span className="text-[var(--white)]/55">
                    peak {num(Math.round(peak.value))}
                    <span className="text-[var(--white)]/30"> · </span>
                    {peak.label}
                  </span>
                ) : null}
                <span>{chart_label(last.to)}</span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function Overview({ data }: { data: Stats }) {
  const [top, ...rest] = data.artists;
  const albums = data.all_albums || [];

  return (
    <div className="space-y-8">
      <HistoryChart history={data.history || []} plays={data.plays} />

      {top ? (
        <TopArtist a={top} total={data.artists.reduce((s, a) => s + a.plays, 0)} />
      ) : null}

      {rest.length ? (
        <Panel title="Top artists" sub="all time" delay={260}>
          {rest.map((a, i) => (
            <StatRow
              key={a.name}
              n={i + 2}
              i={i}
              href={a.url}
              image={a.image}
              back={a.banner || a.image}
              video={a.video}
              name={a.name}
              value={a.plays}
              round
            />
          ))}
        </Panel>
      ) : null}

      {albums.length ? (
        <Panel title="Most played albums" sub="all time" delay={340}>
          {albums.map((a, i) => (
            <StatRow
              key={`${a.name}-${a.artist}`}
              n={i + 1}
              i={i}
              href={a.url}
              image={a.image}
              back={a.image}
              video={a.video}
              name={a.name}
              sub={a.artist}
              value={a.plays}
            />
          ))}
        </Panel>
      ) : null}
    </div>
  );
}
