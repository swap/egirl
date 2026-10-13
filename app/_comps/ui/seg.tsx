import { useEffect, useRef, useState } from "react";

type Props = {
  items: string[];
  value: number;
  onChange: (i: number) => void;
  size?: "sm" | "md";
  className?: string;
  fill?: boolean;
};

type Box = { x: number; w: number };

function Seg({ items, value, onChange, size = "md", className = "", fill = false }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [box, setBox] = useState<Box | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = refs.current[value];
    if (!el) return;
    const sync = () => setBox({ x: el.offsetLeft, w: el.offsetWidth });
    sync();
    const id = requestAnimationFrame(() => setLive(true));
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [value, items.length]);

  const h = size === "sm" ? "h-8 px-3.5 text-[12.5px]" : "h-9 px-5 text-[13.5px]";

  return (
    <div
      role="tablist"
      className={`relative overflow-x-auto rounded-lg border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-[var(--white)]/[0.08] bg-[var(--white)]/[0.025] p-1 shadow-[inset_0_1px_0_#f7f7f708] ${
        fill ? "flex w-full" : "inline-flex max-w-full"
      } ${className}`}
    >
      {box ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-1 bottom-1 left-0 rounded-md border border-[var(--white)]/[0.22] bg-[var(--white)]/[0.06] shadow-[inset_0_1px_0_#f7f7f714,0_10px_24px_-14px_#000000] ${
            live
              ? "transition-[transform,width] duration-[380ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
              : ""
          }`}
          style={{ width: box.w, transform: `translateX(${box.x}px)` }}
        />
      ) : null}
      {items.map((label, i) => (
        <button
          key={label}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={i === value}
          onClick={() => onChange(i)}
          className={`relative z-[1] cursor-pointer rounded-md font-medium whitespace-nowrap outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50 ${h} ${
            fill ? "flex-1 text-center" : ""
          } ${
            i === value
              ? "text-[var(--white)]"
              : "text-[var(--white)]/45 hover:text-[var(--white)]/80"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export { Seg };
