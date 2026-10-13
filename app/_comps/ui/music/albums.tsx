import { useRef } from "react";
import { Music2 } from "lucide-react";
import type { Entry } from "@/app/_comps/lib/music";
import { Empty, Img, num } from "@/app/_comps/ui/music/shared";

export function Album({ t, i }: { t: Entry; i: number }) {
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
    <a
      href={t.url}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      className="rise group relative block aspect-square overflow-hidden rounded-2xl border border-[var(--white)]/[0.1] bg-[var(--white)]/[0.03] shadow-[0_1px_0_#f7f7f70a_inset,0_10px_30px_-12px_#000000cc] outline-none transition-[box-shadow,border-color] duration-300 ease-out hover:border-[var(--white)]/[0.22] hover:shadow-[0_1px_0_#f7f7f714_inset,0_0_0_1px_#f7f7f71a,0_0_32px_#000000bb,0_22px_50px_-14px_#000000] focus-visible:border-[var(--white)]/[0.22] focus-visible:shadow-[0_1px_0_#f7f7f714_inset,0_0_0_1px_#f7f7f71a,0_0_32px_#000000bb,0_22px_50px_-14px_#000000]"
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
        <p className="line-clamp-2 text-[22px] leading-snug font-black tracking-tight">{t.name}</p>
        <p className="mt-2.5 text-[16px] text-[var(--white)]/75">{t.artist}</p>
        <p className="mt-2 text-[14px] tabular-nums text-[var(--white)]/55">
          {num(t.plays)} plays
        </p>
      </div>
    </a>
  );
}

export function Albums({ items }: { items: Entry[] }) {
  if (!items.length) return <Empty />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
      {items.map((a, i) => (
        <Album key={`${a.name}-${a.artist}`} t={a} i={i} />
      ))}
    </div>
  );
}
