import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export function Subject({ id, children }: { id: string; children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const height = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    const kid = inner.current;
    if (!el || !kid) return;

    const next = kid.offsetHeight;
    const prev = height.current;
    height.current = next;

    if (prev == null || next < 1 || Math.abs(prev - next) < 1) {
      el.style.height = "auto";
      return;
    }

    el.style.height = `${prev}px`;
    void el.offsetHeight;
    el.style.height = `${next}px`;

    const done = (e: TransitionEvent) => {
      if (e.propertyName !== "height") return;
      if (wrap.current === el) el.style.height = "auto";
    };
    el.addEventListener("transitionend", done);
    return () => el.removeEventListener("transitionend", done);
  }, [id]);

  return (
    <div
      ref={wrap}
      className="mt-3 overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
    >
      <div ref={inner} key={id}>
        {children}
      </div>
    </div>
  );
}
