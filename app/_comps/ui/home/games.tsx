import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Game } from "@/app/_comps/ui/home/types";

export function GameTitle({ name }: { name: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const sync = () => {
      const w = wrap.current;
      const t = text.current;
      if (!w || !t) return;
      setShift(Math.max(0, t.scrollWidth - w.clientWidth));
    };
    sync();
    const ro = new ResizeObserver(sync);
    if (wrap.current) ro.observe(wrap.current);
    if (text.current) ro.observe(text.current);
    return () => ro.disconnect();
  }, [name]);

  const dur = Math.max(10, shift / 10);

  return (
    <div ref={wrap} className="mt-2 overflow-hidden">
      <span
        ref={text}
        className={`inline-block max-w-none whitespace-nowrap text-[13px] font-medium tracking-[-0.01em] text-[var(--white)]/80 ${
          shift > 0 ? "marquee" : ""
        }`}
        style={
          shift > 0
            ? ({
                "--marquee": `-${shift}px`,
                animationDuration: `${dur}s`,
              } as CSSProperties)
            : undefined
        }
      >
        {name}
      </span>
    </div>
  );
}

export function Games({ items }: { items: Game[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((g) => (
        <article key={g.name} className="w-[7.25rem] shrink-0 sm:w-32">
          <div className="aspect-[3/4] overflow-hidden rounded-[8px] border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.04]">
            {g.cover ? (
              <img
                src={g.cover}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </div>
          <GameTitle name={g.name} />
          {g.tags.length > 0 ? (
            <p className="mt-0.5 truncate text-[11px] text-[var(--white)]/35">
              {g.tags.join(" · ")}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
