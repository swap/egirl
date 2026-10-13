import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Helpers } from "@/app/_comps/lib/commands";

const COLS = 10;
const ROWS = 20;
const SPEEDS = [800, 650, 500, 370, 250, 160];
const DELAYS = [50, 60, 70, 80, 90, 100];
const CLEAR_PTS = [100, 300, 700, 1500];
const EACH = 20;
const STORE = "egirl-tetris-max";
const MAX_PTS = 999999;

type Kind = "I" | "L" | "J" | "Z" | "S" | "O" | "T";

const SHAPES: Record<Kind, number[][]> = {
  I: [[1, 1, 1, 1]],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
};

const ORIGIN: Record<Kind, number[][]> = {
  I: [
    [-1, 1],
    [1, -1],
  ],
  L: [[0, 0]],
  J: [[0, 0]],
  Z: [[0, 0]],
  S: [[0, 0]],
  O: [[0, 0]],
  T: [
    [0, 0],
    [1, 0],
    [-1, 1],
    [0, -1],
  ],
};

const KINDS = Object.keys(SHAPES) as Kind[];

type Piece = {
  kind: Kind;
  shape: number[][];
  x: number;
  y: number;
  rot: number;
};

type Phase = "menu" | "play" | "clear" | "over";

function blank() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function clone(b: number[][]) {
  return b.map((r) => [...r]);
}

function load_max() {
  try {
    const n = Number(localStorage.getItem(STORE) || 0);
    return Number.isFinite(n) ? Math.min(MAX_PTS, Math.max(0, n)) : 0;
  } catch {
    return 0;
  }
}

function save_max(n: number) {
  try {
    localStorage.setItem(STORE, String(Math.min(MAX_PTS, n)));
  } catch {}
}

function rand(): Kind {
  return KINDS[Math.floor(Math.random() * KINDS.length)];
}

function spawn(kind: Kind): Piece {
  const shape = SHAPES[kind].map((r) => [...r]);
  const y = kind === "I" ? 0 : -1;
  const x = kind === "I" ? 3 : 4;
  return { kind, shape, x, y, rot: 0 };
}

function rotate(shape: number[][]) {
  const h = shape.length;
  const w = shape[0].length;
  const out = Array.from({ length: w }, () => Array(h).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[x][h - 1 - y] = shape[y][x];
    }
  }
  return out;
}

function want(b: number[][], p: Piece, ox = 0, oy = 0, shape?: number[][]) {
  const s = shape || p.shape;
  for (let y = 0; y < s.length; y++) {
    for (let x = 0; x < s[y].length; x++) {
      if (!s[y][x]) continue;
      const nx = p.x + x + ox;
      const ny = p.y + y + oy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && b[ny][nx]) return false;
    }
  }
  return true;
}

function merge(b: number[][], p: Piece) {
  const next = clone(b);
  for (let y = 0; y < p.shape.length; y++) {
    for (let x = 0; x < p.shape[y].length; x++) {
      if (!p.shape[y][x]) continue;
      const ny = p.y + y;
      const nx = p.x + x;
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) next[ny][nx] = 1;
    }
  }
  return next;
}

function full_rows(b: number[][]) {
  const lines: number[] = [];
  for (let y = 0; y < ROWS; y++) {
    if (b[y].every((c) => c)) lines.push(y);
  }
  return lines;
}

function clear_rows(b: number[][], lines: number[]) {
  const next = clone(b);
  for (const y of [...lines].sort((a, c) => c - a)) {
    next.splice(y, 1);
    next.unshift(Array(COLS).fill(0));
  }
  return next;
}

function start_board(n: number) {
  const b = blank();
  for (let i = 0; i < n; i++) {
    const y = ROWS - 1 - i;
    let min = 5;
    let max = 8;
    if (i > 2 && i <= 6) {
      min = 4;
      max = 9;
    } else if (i > 6) {
      min = 3;
      max = 9;
    }
    const count = min + Math.floor(Math.random() * (max - min + 1));
    const line = Array(count).fill(1);
    while (line.length < COLS) {
      line.splice(Math.floor(Math.random() * (line.length + 1)), 0, 0);
    }
    b[y] = line;
  }
  return b;
}

function paint_next(kind: Kind) {
  const grid = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const off: Record<Kind, [number, number]> = {
    I: [1, 0],
    L: [0, 0],
    J: [0, 0],
    Z: [0, 0],
    S: [0, 0],
    O: [0, 1],
    T: [0, 0],
  };
  const [oy, ox] = off[kind];
  const shape = SHAPES[kind];
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) grid[y + oy][x + ox] = 1;
    }
  }
  return grid;
}

function cell(n: number) {
  if (n === 2) return "▣";
  if (n === 1) return "■";
  return "·";
}

function Tetris({ done }: Helpers) {
  const [phase, set_phase] = useState<Phase>("menu");
  const [board, set_board] = useState(blank);
  const [piece, set_piece] = useState<Piece | null>(null);
  const [next_kind, set_next] = useState<Kind>(rand);
  const [score, set_score] = useState(0);
  const [max, set_max] = useState(load_max);
  const [lines, set_lines] = useState(0);
  const [speed, set_speed] = useState(1);
  const [speed0, set_speed0] = useState(1);
  const [start_n, set_start_n] = useState(0);
  const [pause, set_pause] = useState(false);
  const [flash, set_flash] = useState<number[] | null>(null);
  const [focus, set_focus] = useState(true);

  const board_r = useRef(board);
  const piece_r = useRef(piece);
  const phase_r = useRef(phase);
  const pause_r = useRef(pause);
  const focus_r = useRef(focus);
  const speed_r = useRef(speed);
  const next_r = useRef(next_kind);
  const score_r = useRef(score);
  const lines_r = useRef(lines);
  const speed0_r = useRef(speed0);
  const start_n_r = useRef(start_n);
  const max_r = useRef(max);
  const lock_r = useRef(false);
  const fall_r = useRef(0);
  const hold_r = useRef<Record<string, number>>({});
  const stamp_r = useRef(Date.now());

  board_r.current = board;
  piece_r.current = piece;
  phase_r.current = phase;
  pause_r.current = pause;
  focus_r.current = focus;
  speed_r.current = speed;
  next_r.current = next_kind;
  score_r.current = score;
  lines_r.current = lines;
  speed0_r.current = speed0;
  start_n_r.current = start_n;
  max_r.current = max;

  function bump(pts: number) {
    const n = Math.min(MAX_PTS, score_r.current + pts);
    score_r.current = n;
    set_score(n);
    if (n > max_r.current) {
      max_r.current = n;
      set_max(n);
      save_max(n);
    }
  }

  function stop_fall() {
    if (fall_r.current) {
      window.clearTimeout(fall_r.current);
      fall_r.current = 0;
    }
  }

  function clear_holds() {
    for (const k of Object.keys(hold_r.current)) {
      window.clearTimeout(hold_r.current[k]);
      delete hold_r.current[k];
    }
  }

  function begin() {
    stop_fall();
    lock_r.current = false;
    pause_r.current = false;
    set_pause(false);
    set_flash(null);
    set_score(0);
    score_r.current = 0;
    set_lines(0);
    lines_r.current = 0;
    const spd = speed0_r.current;
    set_speed(spd);
    speed_r.current = spd;
    const b = start_board(start_n_r.current);
    const first = spawn(next_r.current);
    const nxt = rand();
    board_r.current = b;
    piece_r.current = first;
    next_r.current = nxt;
    phase_r.current = "play";
    set_board(b);
    set_piece(first);
    set_next(nxt);
    set_phase("play");
    stamp_r.current = Date.now();
    auto();
  }

  function auto(remain?: number) {
    stop_fall();
    if (phase_r.current !== "play" || pause_r.current || !focus_r.current) return;
    const wait =
      remain !== undefined
        ? Math.max(0, remain)
        : SPEEDS[speed_r.current - 1];
    fall_r.current = window.setTimeout(() => tick(), wait);
  }

  function tick() {
    if (lock_r.current || phase_r.current !== "play") return;
    if (pause_r.current || !focus_r.current) return;
    const p = piece_r.current;
    const b = board_r.current;
    if (!p) return;
    if (want(b, p, 0, 1)) {
      const next = { ...p, y: p.y + 1 };
      piece_r.current = next;
      set_piece(next);
      stamp_r.current = Date.now();
      auto();
    } else {
      lock(p, b);
    }
  }

  function lock(p: Piece, b: number[][]) {
    lock_r.current = true;
    stop_fall();
    const merged = merge(b, p);
    bump(10 + (speed_r.current - 1) * 2);
    const clears = full_rows(merged);
    board_r.current = merged;
    piece_r.current = null;
    set_board(merged);
    set_piece(null);

    if (clears.length) {
      phase_r.current = "clear";
      set_phase("clear");
      flash_clear(merged, clears);
      return;
    }

    if (merged[0].some((c) => c)) {
      phase_r.current = "over";
      set_phase("over");
      over_anim(merged);
      return;
    }

    window.setTimeout(() => {
      lock_r.current = false;
      const nxt = rand();
      const cur = spawn(next_r.current);
      next_r.current = nxt;
      piece_r.current = cur;
      phase_r.current = "play";
      set_next(nxt);
      set_piece(cur);
      set_phase("play");
      stamp_r.current = Date.now();
      auto();
    }, 100);
  }

  function flash_clear(b: number[][], clears: number[]) {
    let step = 0;
    const run = () => {
      set_flash(step % 2 === 0 ? clears : null);
      const painted = clone(b);
      if (step % 2 === 0) {
        for (const y of clears) painted[y] = Array(COLS).fill(2);
      }
      board_r.current = painted;
      set_board(painted);
      step++;
      if (step < 6) {
        window.setTimeout(run, 100);
        return;
      }
      const next = clear_rows(b, clears);
      const total = lines_r.current + clears.length;
      lines_r.current = total;
      set_lines(total);
      bump(CLEAR_PTS[clears.length - 1]);
      const add = Math.floor(total / EACH);
      const spd = Math.min(6, speed0_r.current + add);
      speed_r.current = spd;
      set_speed(spd);
      set_flash(null);
      board_r.current = next;
      set_board(next);
      lock_r.current = false;
      const nxt = rand();
      const cur = spawn(next_r.current);
      next_r.current = nxt;
      piece_r.current = cur;
      phase_r.current = "play";
      set_next(nxt);
      set_piece(cur);
      set_phase("play");
      stamp_r.current = Date.now();
      auto();
    };
    run();
  }

  function over_anim(start: number[][]) {
    stop_fall();
    let filled = clone(start);
    let i = 0;
    const step = () => {
      if (i <= 19) {
        filled[ROWS - 1 - i] = Array(COLS).fill(1);
        board_r.current = filled;
        set_board(clone(filled));
      } else if (i <= 39) {
        filled[i - 20] = Array(COLS).fill(0);
        board_r.current = filled;
        set_board(clone(filled));
      } else {
        const empty = blank();
        board_r.current = empty;
        piece_r.current = null;
        phase_r.current = "menu";
        set_board(empty);
        set_piece(null);
        set_phase("menu");
        lock_r.current = false;
        return;
      }
      i++;
      window.setTimeout(step, 40);
    };
    step();
  }

  function move(dx: number) {
    if (lock_r.current || phase_r.current !== "play") return;
    if (pause_r.current) {
      pause_r.current = false;
      set_pause(false);
      auto();
      return;
    }
    const p = piece_r.current;
    const b = board_r.current;
    if (!p) return;
    const delay = DELAYS[speed_r.current - 1];
    if (want(b, p, dx, 0)) {
      const next = { ...p, x: p.x + dx };
      piece_r.current = next;
      set_piece(next);
      stamp_r.current += delay;
    } else {
      stamp_r.current += Math.floor(delay / 1.5);
    }
    const remain = SPEEDS[speed_r.current - 1] - (Date.now() - stamp_r.current);
    auto(remain);
  }

  function soft() {
    if (lock_r.current || phase_r.current !== "play") return;
    if (pause_r.current) {
      pause_r.current = false;
      set_pause(false);
      auto();
      return;
    }
    const p = piece_r.current;
    const b = board_r.current;
    if (!p) return;
    if (want(b, p, 0, 1)) {
      const next = { ...p, y: p.y + 1 };
      piece_r.current = next;
      set_piece(next);
      stamp_r.current = Date.now();
      auto();
    } else {
      lock(p, b);
    }
  }

  function hard() {
    if (lock_r.current || phase_r.current !== "play") return;
    if (pause_r.current) {
      pause_r.current = false;
      set_pause(false);
      auto();
      return;
    }
    const p = piece_r.current;
    const b = board_r.current;
    if (!p) return;
    let y = p.y;
    while (want(b, { ...p, y: y + 1 })) y++;
    const dropped = { ...p, y };
    piece_r.current = dropped;
    lock(dropped, b);
  }

  function turn() {
    if (lock_r.current || phase_r.current !== "play") return;
    if (pause_r.current) {
      pause_r.current = false;
      set_pause(false);
      auto();
      return;
    }
    const p = piece_r.current;
    const b = board_r.current;
    if (!p) return;
    const shape = rotate(p.shape);
    const origin = ORIGIN[p.kind][p.rot] || [0, 0];
    const next: Piece = {
      ...p,
      shape,
      x: p.x + origin[1],
      y: p.y + origin[0],
      rot: (p.rot + 1) % ORIGIN[p.kind].length,
    };
    if (want(b, next)) {
      piece_r.current = next;
      set_piece(next);
    }
  }

  function hold(
    key: string,
    fn: () => void,
    opts: { once?: boolean; begin?: number; interval?: number },
  ) {
    if (hold_r.current[key]) {
      window.clearTimeout(hold_r.current[key]);
      delete hold_r.current[key];
    }
    fn();
    if (opts.once) return;
    let begin = opts.begin ?? 100;
    const interval = opts.interval ?? 50;
    const loop = () => {
      hold_r.current[key] = window.setTimeout(() => {
        begin = 0;
        fn();
        loop();
      }, begin || interval);
    };
    loop();
  }

  function release(key: string) {
    if (hold_r.current[key]) {
      window.clearTimeout(hold_r.current[key]);
      delete hold_r.current[key];
    }
  }

  useEffect(() => {
    function on_down(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        stop_fall();
        clear_holds();
        done();
        return;
      }

      const ph = phase_r.current;

      if (ph === "menu") {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          e.preventDefault();
          hold("left", () => set_speed0((s) => (s <= 1 ? 6 : s - 1)), {
            begin: 200,
            interval: 100,
          });
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          e.preventDefault();
          hold("right", () => set_speed0((s) => (s >= 6 ? 1 : s + 1)), {
            begin: 200,
            interval: 100,
          });
        } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          hold("up", () => set_start_n((n) => (n >= 10 ? 0 : n + 1)), {
            begin: 200,
            interval: 100,
          });
        } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          e.preventDefault();
          hold("down", () => set_start_n((n) => (n <= 0 ? 10 : n - 1)), {
            begin: 200,
            interval: 100,
          });
        } else if (e.key === " ") {
          e.preventDefault();
          begin();
        }
        return;
      }

      if (ph === "clear" || ph === "over") return;

      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        const next = !pause_r.current;
        pause_r.current = next;
        set_pause(next);
        if (!next) auto();
        else stop_fall();
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        hold("left", () => move(-1), { begin: 200, interval: 100 });
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        hold("right", () => move(1), { begin: 200, interval: 100 });
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        hold("down", soft, { begin: 40, interval: 40 });
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        hold("rot", turn, { once: true });
      } else if (e.key === " ") {
        e.preventDefault();
        hold("drop", hard, { once: true });
      }
    }

    function on_up(e: KeyboardEvent) {
      const map: Record<string, string> = {
        ArrowLeft: "left",
        a: "left",
        A: "left",
        ArrowRight: "right",
        d: "right",
        D: "right",
        ArrowDown: "down",
        s: "down",
        S: "down",
        ArrowUp: "up",
        w: "up",
        W: "up",
        " ": "drop",
      };
      const k = map[e.key];
      if (k) release(k);
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") release("rot");
    }

    function on_vis() {
      const on = document.visibilityState === "visible";
      set_focus(on);
      if (!on) stop_fall();
      else if (phase_r.current === "play" && !pause_r.current) auto();
    }

    window.addEventListener("keydown", on_down);
    window.addEventListener("keyup", on_up);
    document.addEventListener("visibilitychange", on_vis);
    return () => {
      window.removeEventListener("keydown", on_down);
      window.removeEventListener("keyup", on_up);
      document.removeEventListener("visibilitychange", on_vis);
      stop_fall();
      clear_holds();
    };
  }, [done]);

  const view = clone(board);
  if (piece && phase === "play") {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (!piece.shape[y][x]) continue;
        const ny = piece.y + y;
        const nx = piece.x + x;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
          view[ny][nx] = view[ny][nx] ? 2 : 1;
        }
      }
    }
  }
  if (flash) {
    for (const y of flash) view[y] = Array(COLS).fill(2);
  }

  const rows: ReactNode[] = view.map((row, y) => (
    <div key={y} className="leading-none tracking-wider">
      {row.map((c) => cell(c)).join("")}
    </div>
  ));

  const preview = paint_next(next_kind);
  const next_rows = preview.map((row, y) => (
    <div key={y} className="leading-none tracking-wider">
      {row.map((c) => cell(c)).join("")}
    </div>
  ));

  if (phase === "menu") {
    return (
      <div className="font-mono text-sm">
        <p className="mb-2 text-[13px] text-[var(--term-muted)]">
          ←→ speed · ↑↓ start lines · space play · q quit
        </p>
        <div className="select-none space-y-1">
          <div>speed {speed0}/6</div>
          <div>start {start_n}/10</div>
          <div>max {max}</div>
          <div className="mt-2 text-[var(--term-muted)]">next</div>
          <div>{next_rows}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono text-sm">
      <p className="mb-2 text-[13px] text-[var(--term-muted)]">
        a/d move · w rot · s soft · space hard · p pause · q quit
        {pause ? " · paused" : ""}
        {!focus ? " · blurred" : ""}
      </p>
      <div className="flex gap-6 select-none">
        <div>{rows}</div>
        <div className="space-y-1 text-[13px]">
          <div>score {score}</div>
          <div>max {max}</div>
          <div>lines {lines}</div>
          <div>speed {speed}/6</div>
          <div className="pt-2 text-[var(--term-muted)]">next</div>
          <div>{next_rows}</div>
        </div>
      </div>
    </div>
  );
}

function run(_args: string[], helpers: Helpers) {
  return <Tetris done={helpers.done} />;
}

const help = "Play tetris (space start, q quit)";
const group = "games";

export { run, help, group };
