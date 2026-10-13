import { useEffect, useReducer, useRef, type ReactNode } from "react";
import type { Helpers } from "@/app/_comps/lib/commands";

const COLS = 20;
const ROWS = 14;
const SLOW = 140;
const FAST = 60;
const STEP = 3;
const QUEUE = 3;
const BONUS_EVERY = 5;
const BONUS_LIFE = 40;
const STORE = "egirl-snake-max";
// cells are drawn with css, not block glyphs: the web font has no box-drawing
// characters and the system fallback differs in width per os
const SIZE = "1.1em";

const FOOD = "#ff7eb6";
const BONUS = "#ffd166";

type Pt = { x: number; y: number };
type Phase = "ready" | "play" | "pause" | "dead";

type Game = {
  phase: Phase;
  body: Pt[];
  dir: Pt;
  queue: Pt[];
  food: Pt;
  bonus: Pt | null;
  bonus_left: number;
  eaten: number;
  score: number;
  max: number;
  best: boolean;
};

const DIRS: Record<string, Pt> = {
  arrowup: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

function eq(a: Pt, b: Pt) {
  return a.x === b.x && a.y === b.y;
}

function load_max() {
  try {
    const n = Number(localStorage.getItem(STORE) || 0);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  } catch {
    return 0;
  }
}

function save_max(n: number) {
  try {
    localStorage.setItem(STORE, String(n));
  } catch {}
}

function free(taken: Pt[]): Pt {
  const open: Pt[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.some((t) => t.x === x && t.y === y)) open.push({ x, y });
    }
  }
  return open[Math.floor(Math.random() * open.length)] || { x: -1, y: -1 };
}

function fresh(max: number): Game {
  const y = Math.floor(ROWS / 2);
  const body = [
    { x: 5, y },
    { x: 4, y },
    { x: 3, y },
  ];
  return {
    phase: "ready",
    body,
    dir: { x: 1, y: 0 },
    queue: [],
    food: { x: COLS - 6, y },
    bonus: null,
    bonus_left: 0,
    eaten: 0,
    score: 0,
    max,
    best: false,
  };
}

function delay(g: Game) {
  return Math.max(FAST, SLOW - g.eaten * STEP);
}

function Snake({ done }: Helpers) {
  const game = useRef<Game>(fresh(load_max()));
  const timer = useRef(0);
  const [, render] = useReducer((n: number) => n + 1, 0);

  function stop() {
    window.clearTimeout(timer.current);
    timer.current = 0;
  }

  function loop() {
    stop();
    if (game.current.phase !== "play") return;
    timer.current = window.setTimeout(() => {
      step();
      loop();
    }, delay(game.current));
  }

  function step() {
    const g = game.current;
    if (g.queue.length) g.dir = g.queue.shift()!;
    const head = { x: g.body[0].x + g.dir.x, y: g.body[0].y + g.dir.y };
    const grows = eq(head, g.food) || (g.bonus !== null && eq(head, g.bonus));
    // the tail moves out of the way this tick unless we're growing
    const solid = grows ? g.body : g.body.slice(0, -1);

    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= COLS ||
      head.y >= ROWS ||
      solid.some((p) => eq(p, head))
    ) {
      g.phase = "dead";
      if (g.score > g.max) {
        g.max = g.score;
        g.best = true;
        save_max(g.score);
      }
      render();
      return;
    }

    g.body = [head, ...solid];

    if (eq(head, g.food)) {
      g.eaten++;
      g.score += 1;
      g.food = free(g.body);
      if (!g.bonus && g.eaten % BONUS_EVERY === 0) {
        g.bonus = free([...g.body, g.food]);
        g.bonus_left = BONUS_LIFE;
      }
    } else if (g.bonus && eq(head, g.bonus)) {
      g.score += 5;
      g.bonus = null;
    }

    if (g.bonus && --g.bonus_left <= 0) g.bonus = null;
    render();
  }

  function start() {
    const g = game.current;
    if (g.phase === "dead") game.current = { ...fresh(g.max), phase: "play" };
    else g.phase = "play";
    render();
    loop();
  }

  function pause() {
    const g = game.current;
    if (g.phase === "play") {
      g.phase = "pause";
      stop();
      render();
    } else if (g.phase === "pause") {
      start();
    }
  }

  function turn(d: Pt) {
    const g = game.current;
    // compare against the last queued turn so fast double-taps aren't dropped
    const prev = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
    if (eq(d, prev) || (d.x === -prev.x && d.y === -prev.y)) return;
    if (g.queue.length >= QUEUE) return;
    g.queue.push(d);
  }

  useEffect(() => {
    function on_key(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const g = game.current;

      if (k === "q") {
        e.preventDefault();
        stop();
        done();
        return;
      }
      if (k === "p") {
        e.preventDefault();
        pause();
        return;
      }

      const d = DIRS[k];
      if (k === " " || k === "enter" || k === "r") {
        e.preventDefault();
        if (g.phase !== "play") start();
        return;
      }
      if (!d) return;
      e.preventDefault();

      if (g.phase === "ready" || g.phase === "pause") {
        if (!(d.x === -g.dir.x && d.y === -g.dir.y)) g.queue = [d];
        start();
        return;
      }
      if (g.phase === "play") turn(d);
    }

    function on_vis() {
      if (document.visibilityState !== "visible" && game.current.phase === "play") {
        pause();
      }
    }

    window.addEventListener("keydown", on_key);
    document.addEventListener("visibilitychange", on_vis);
    return () => {
      window.removeEventListener("keydown", on_key);
      document.removeEventListener("visibilitychange", on_vis);
      stop();
    };
  }, [done]);

  const g = game.current;
  const dead = g.phase === "dead";
  const len = g.body.length;
  const tiles: ReactNode[] = Array.from({ length: ROWS * COLS }, (_, i) => (
    <span
      key={i}
      className="flex items-center justify-center text-[10px] text-[var(--term-line)]"
    >
      ·
    </span>
  ));
  const at = (p: Pt) => p.y * COLS + p.x;

  tiles[at(g.food)] = <Food key="food" />;
  if (g.bonus) {
    const blink = g.bonus_left < 12 && g.bonus_left % 2 === 0;
    tiles[at(g.bonus)] = <Bonus key="bonus" dim={blink} />;
  }
  g.body.forEach((p, i) => {
    if (p.x < 0 || p.y < 0 || p.x >= COLS || p.y >= ROWS) return;
    const head = i === 0;
    const fade = head ? 1 : 0.85 - (i / Math.max(len, 1)) * 0.5;
    tiles[at(p)] = (
      <span
        key={at(p)}
        className={head ? "m-px rounded-[3px]" : "m-[2px] rounded-[2px]"}
        style={{
          background: dead && head ? FOOD : "var(--term-bright)",
          opacity: dead && !head ? fade * 0.5 : fade,
        }}
      />
    );
  });

  const status =
    g.phase === "ready"
      ? "press an arrow to start"
      : g.phase === "pause"
        ? "paused · p to resume"
        : dead
          ? `game over · ${g.best ? "new best! · " : ""}space to retry`
          : "";

  return (
    <div className="font-mono text-sm">
      <p className="mb-2 text-[13px] text-[var(--term-muted)]">
        arrows / wasd · p pause · q quit
      </p>
      <div className="flex gap-6 select-none">
        <div
          className="grid self-start rounded-[3px] border border-[var(--term-line)] p-[2px]"
          style={{
            gridTemplateColumns: `repeat(${COLS}, ${SIZE})`,
            gridAutoRows: SIZE,
            opacity: g.phase === "pause" ? 0.35 : 1,
          }}
        >
          {tiles}
        </div>
        <div className="space-y-1 text-[13px]">
          <div>
            score <span className="text-[var(--term-bright)]">{g.score}</span>
          </div>
          <div>best {Math.max(g.max, g.score)}</div>
          <div>length {len}</div>
          <div>speed {Math.round(1000 / delay(g))}/s</div>
          <div
            className="grid gap-x-2 gap-y-1 pt-2 text-[var(--term-muted)]"
            style={{ gridTemplateColumns: `${SIZE} auto`, gridAutoRows: SIZE }}
          >
            <Food />
            <span className="flex items-center">+1</span>
            <Bonus />
            <span className="flex items-center">+5</span>
          </div>
        </div>
      </div>
      {status ? (
        <p className={`mt-2 text-[13px] ${dead ? "text-[var(--term-bright)]" : "text-[var(--term-muted)]"}`}>
          {status}
        </p>
      ) : null}
    </div>
  );
}

function Food() {
  return <span className="m-[3px] rounded-full" style={{ background: FOOD }} />;
}

function Bonus({ dim = false }: { dim?: boolean }) {
  return (
    <span
      className="m-[4px] rotate-45 rounded-[1px]"
      style={{ background: BONUS, opacity: dim ? 0.25 : 1 }}
    />
  );
}

function run(_args: string[], helpers: Helpers) {
  return <Snake done={helpers.done} />;
}

const help = "Play snake (arrows/wasd, q quit)";
const group = "games";

export { run, help, group };
