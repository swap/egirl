import { useEffect, useRef, useState } from "react";

type Box = { x: number; y: number; w: number; h: number };

type Props = {
  items: (HTMLElement | null)[];
  index: number;
  start?: number;
};

function box(el: HTMLElement): Box {
  return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
}

function SelectAnimation({ items, index, start = index }: Props) {
  const [pos, setPos] = useState<Box | null>(null);
  const first = useRef(true);

  useEffect(() => {
    const to = items[index];
    if (!to) return;

    let raf1 = 0;
    let raf2 = 0;
    const from = items[start];

    if (first.current && from && from !== to) {
      setPos(box(from));
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setPos(box(to)));
      });
    } else {
      setPos(box(to));
    }
    first.current = false;

    const sync = () => setPos(box(to));
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", sync);
    };
  }, [items, index, start]);

  if (!pos) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 rounded-lg border border-[#f7f7f71c] bg-[#f7f7f70d] shadow-[inset_0_1px_0_#f7f7f712,0_8px_24px_-14px_#171717] transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
      style={{
        width: pos.w,
        height: pos.h,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
      }}
    />
  );
}

export { SelectAnimation };
