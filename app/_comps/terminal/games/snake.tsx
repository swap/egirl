import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Helpers } from "@/app/_comps/lib/commands";

const COLS = 16;
const ROWS = 12;
const TICK = 120;

type Pt = { x: number; y: number };

function eq(a: Pt, b: Pt) {
  return a.x === b.x && a.y === b.y;
}

function food(snake: Pt[]): Pt {
  while (true) {
    const p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
    if (!snake.some((s) => eq(s, p))) return p;
  }
}

function Snake({ done }: Helpers) {
  const [body, set_body] = useState<Pt[]>([
    { x: 4, y: 6 },
    { x: 3, y: 6 },
    { x: 2, y: 6 },
  ]);
  const [bit, set_bit] = useState<Pt>({ x: 10, y: 6 });
  const [dead, set_dead] = useState(false);
  const [score, set_score] = useState(0);
  const dir = useRef<Pt>({ x: 1, y: 0 });
  const next = useRef<Pt>({ x: 1, y: 0 });

  useEffect(() => {
    function on_key(e: KeyboardEvent) {
      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        done();
        return;
      }
      const map: Record<string, Pt> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      if (d.x === -dir.current.x && d.y === -dir.current.y) return;
      next.current = d;
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [done]);

  useEffect(() => {
    if (dead) return;
    const id = window.setInterval(() => {
      dir.current = next.current;
      set_body((prev) => {
        const head = {
          x: prev[0].x + dir.current.x,
          y: prev[0].y + dir.current.y,
        };
        if (
          head.x < 0 ||
          head.y < 0 ||
          head.x >= COLS ||
          head.y >= ROWS ||
          prev.some((p) => eq(p, head))
        ) {
          set_dead(true);
          return prev;
        }
        const next_body = [head, ...prev];
        if (eq(head, bit)) {
          set_score((s) => s + 1);
          set_bit(food(next_body));
          return next_body;
        }
        next_body.pop();
        return next_body;
      });
    }, TICK);
    return () => window.clearInterval(id);
  }, [dead, bit]);

  const rows: ReactNode[] = [];
  for (let y = 0; y < ROWS; y++) {
    let row = "";
    for (let x = 0; x < COLS; x++) {
      const p = { x, y };
      if (eq(bit, p)) row += "●";
      else if (body.some((s) => eq(s, p))) row += "■";
      else row += "·";
    }
    rows.push(
      <div key={y} className="leading-none tracking-wider">
        {row}
      </div>,
    );
  }

  return (
    <div className="font-mono text-sm">
      <p className="mb-2 text-[13px] text-[var(--term-muted)]">
        arrows / wasd · q quit · score {score}
        {dead ? " · dead" : ""}
      </p>
      <div className="select-none">{rows}</div>
    </div>
  );
}

function run(_args: string[], helpers: Helpers) {
  return <Snake done={helpers.done} />;
}

const help = "Play snake (arrows/wasd, q quit)";
const group = "games";

export { run, help, group };
