import { useEffect, useReducer, useRef } from "react";
import type { Helpers } from "@/app/_comps/lib/commands";

const COLS = 10;
const ROWS = 20;
const HIDDEN = 2;
const HEIGHT = ROWS + HIDDEN;
const MAX_LEVEL = 20;
const START_LEVELS = 15;
const GARBAGE = 10;
const PER_LEVEL = 10;
const DAS = 160;
const ARR = 40;
const SOFT = 30;
const LOCK = 500;
const RESETS = 15;
const CLEAR_MS = 220;
const PREVIEW = 4;
const LABEL_MS = 1400;
const STORE = "egirl-tetris-max";
// cells are drawn with css, not block glyphs: the web font has no box-drawing
// characters and the system fallback differs in width per os
const SIZE = "1.1em";
const MINI = "0.8em";
const MAX_PTS = 9_999_999;

type Kind = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
type Phase = "menu" | "play" | "clear" | "over";

const KINDS: Kind[] = ["I", "J", "L", "O", "S", "T", "Z"];

// SRS spawn orientations; rotating the whole box keeps pieces on the SRS grid
const SHAPES: Record<Kind, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

const COLORS: Record<Kind, string> = {
  I: "#7dd3fc",
  J: "#93a5fd",
  L: "#fdba74",
  O: "#fde68a",
  S: "#86efac",
  T: "#d8b4fe",
  Z: "#fca5a5",
};

// SRS wall kicks as [x, y] with y pointing up, keyed by "from>to"
const KICKS: Record<string, [number, number][]> = {
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const KICKS_I: Record<string, [number, number][]> = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

const LINE_PTS = [0, 100, 300, 500, 800];
const LINE_NAMES = ["", "single", "double", "triple", "tetris"];

type Cell = Kind | null;

type Piece = {
  kind: Kind;
  shape: number[][];
  x: number;
  y: number;
  rot: number;
};

type Game = {
  phase: Phase;
  paused: boolean;
  board: Cell[][];
  piece: Piece | null;
  bag: Kind[];
  queue: Kind[];
  hold: Kind | null;
  held: boolean;
  score: number;
  max: number;
  best: boolean;
  lines: number;
  level: number;
  start_level: number;
  garbage: number;
  combo: number;
  b2b: boolean;
  label: string;
  label_t: number;
  grav_t: number;
  lock_t: number;
  resets: number;
  low: number;
  clearing: number[];
  clear_t: number;
  dir: -1 | 0 | 1;
  das_t: number;
  arr_t: number;
  keys: Record<string, boolean>;
};

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

function blank(): Cell[][] {
  return Array.from({ length: HEIGHT }, () => Array<Cell>(COLS).fill(null));
}

function shuffle(): Kind[] {
  const bag = [...KINDS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function rotate(shape: number[][], cw: boolean) {
  const n = shape.length;
  const out = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (cw) out[x][n - 1 - y] = shape[y][x];
      else out[n - 1 - x][y] = shape[y][x];
    }
  }
  return out;
}

function spawn(kind: Kind): Piece {
  const shape = SHAPES[kind].map((r) => [...r]);
  const x = kind === "O" ? 4 : 3;
  const y = kind === "I" ? HIDDEN - 2 : HIDDEN - 1;
  return { kind, shape, x, y, rot: 0 };
}

function fits(b: Cell[][], p: Piece, dx = 0, dy = 0, shape = p.shape) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const nx = p.x + x + dx;
      const ny = p.y + y + dy;
      if (nx < 0 || nx >= COLS || ny >= HEIGHT) return false;
      if (ny >= 0 && b[ny][nx]) return false;
    }
  }
  return true;
}

function drop_y(b: Cell[][], p: Piece) {
  let y = 0;
  while (fits(b, p, 0, y + 1)) y++;
  return p.y + y;
}

function garbage_board(rows: number) {
  const b = blank();
  for (let i = 0; i < rows; i++) {
    const hole = Math.floor(Math.random() * COLS);
    b[HEIGHT - 1 - i] = Array.from({ length: COLS }, (_, x) =>
      x === hole || Math.random() < 0.15 ? null : KINDS[Math.floor(Math.random() * KINDS.length)],
    );
  }
  return b;
}

function gravity(level: number) {
  // tetris guideline curve, in ms per row
  return Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000;
}

function fresh(prev?: Game): Game {
  const bag = shuffle();
  const queue: Kind[] = [];
  while (queue.length < PREVIEW + 1) {
    if (!bag.length) bag.push(...shuffle());
    queue.push(bag.shift()!);
  }
  return {
    phase: "menu",
    paused: false,
    board: blank(),
    piece: null,
    bag,
    queue,
    hold: null,
    held: false,
    score: 0,
    max: prev?.max ?? load_max(),
    best: false,
    lines: 0,
    level: prev?.start_level ?? 1,
    start_level: prev?.start_level ?? 1,
    garbage: prev?.garbage ?? 0,
    combo: -1,
    b2b: false,
    label: "",
    label_t: 0,
    grav_t: 0,
    lock_t: 0,
    resets: 0,
    low: 0,
    clearing: [],
    clear_t: 0,
    dir: 0,
    das_t: 0,
    arr_t: 0,
    keys: {},
  };
}

function Tetris({ done }: Helpers) {
  const game = useRef<Game>(fresh());
  const [, render] = useReducer((n: number) => n + 1, 0);

  function pull(g: Game) {
    const kind = g.queue.shift()!;
    if (!g.bag.length) g.bag = shuffle();
    g.queue.push(g.bag.shift()!);
    return kind;
  }

  function enter(g: Game, kind: Kind) {
    const p = spawn(kind);
    if (!fits(g.board, p)) {
      over(g);
      return;
    }
    // guideline: drop one row right away if there's room
    if (fits(g.board, p, 0, 1)) p.y++;
    g.piece = p;
    g.grav_t = 0;
    g.lock_t = 0;
    g.resets = 0;
    g.low = p.y;
  }

  function over(g: Game) {
    g.phase = "over";
    g.piece = null;
    if (g.score > g.max) {
      g.max = g.score;
      g.best = true;
      save_max(g.score);
    }
  }

  function add(g: Game, pts: number) {
    g.score = Math.min(MAX_PTS, g.score + pts);
  }

  function say(g: Game, text: string) {
    g.label = text;
    g.label_t = LABEL_MS;
  }

  function begin() {
    const g = fresh(game.current);
    g.phase = "play";
    g.board = garbage_board(g.garbage);
    game.current = g;
    enter(g, pull(g));
  }

  function grounded(g: Game) {
    return !!g.piece && !fits(g.board, g.piece, 0, 1);
  }

  // moving or rotating on the floor buys more time, up to RESETS times
  function nudge(g: Game) {
    if (!g.piece) return;
    if (g.piece.y > g.low) {
      g.low = g.piece.y;
      g.resets = 0;
    }
    if (grounded(g) && g.resets < RESETS) {
      g.lock_t = 0;
      g.resets++;
    }
  }

  function shift(g: Game, dx: number) {
    const p = g.piece;
    if (!p || !fits(g.board, p, dx, 0)) return false;
    p.x += dx;
    nudge(g);
    return true;
  }

  function turn(g: Game, cw: boolean) {
    const p = g.piece;
    if (!p || p.kind === "O") return;
    const to = (p.rot + (cw ? 1 : 3)) % 4;
    const shape = rotate(p.shape, cw);
    const table = p.kind === "I" ? KICKS_I : KICKS;
    for (const [kx, ky] of table[`${p.rot}>${to}`]) {
      if (fits(g.board, p, kx, -ky, shape)) {
        p.shape = shape;
        p.x += kx;
        p.y -= ky;
        p.rot = to;
        nudge(g);
        return;
      }
    }
  }

  function fall(g: Game, soft: boolean) {
    const p = g.piece;
    if (!p || !fits(g.board, p, 0, 1)) return false;
    p.y++;
    if (soft) add(g, 1);
    nudge(g);
    return true;
  }

  function slam(g: Game) {
    const p = g.piece;
    if (!p) return;
    const y = drop_y(g.board, p);
    add(g, (y - p.y) * 2);
    p.y = y;
    lock(g);
  }

  function swap(g: Game) {
    if (!g.piece || g.held) return;
    const cur = g.piece.kind;
    const next = g.hold ?? pull(g);
    g.hold = cur;
    g.held = true;
    enter(g, next);
  }

  function tspin(g: Game, p: Piece) {
    if (p.kind !== "T") return false;
    const corners = [
      [0, 0],
      [2, 0],
      [0, 2],
      [2, 2],
    ].filter(([cx, cy]) => {
      const x = p.x + cx;
      const y = p.y + cy;
      return x < 0 || x >= COLS || y >= HEIGHT || (y >= 0 && !!g.board[y][x]);
    });
    return corners.length >= 3;
  }

  function lock(g: Game) {
    const p = g.piece;
    if (!p) return;
    const spun = tspin(g, p);
    let above = true;
    for (let y = 0; y < p.shape.length; y++) {
      for (let x = 0; x < p.shape[y].length; x++) {
        if (!p.shape[y][x]) continue;
        const ny = p.y + y;
        if (ny >= 0 && ny < HEIGHT) g.board[ny][p.x + x] = p.kind;
        if (ny >= HIDDEN) above = false;
      }
    }
    g.piece = null;
    g.held = false;

    if (above) {
      over(g);
      return;
    }

    const full: number[] = [];
    for (let y = 0; y < HEIGHT; y++) {
      if (g.board[y].every(Boolean)) full.push(y);
    }

    const n = full.length;
    if (n) {
      const hard = n === 4 || spun;
      let pts = (spun ? [400, 800, 1200, 1600][n] : LINE_PTS[n]) * g.level;
      if (hard && g.b2b) pts = Math.floor(pts * 1.5);
      g.combo++;
      if (g.combo > 0) pts += 50 * g.combo * g.level;
      add(g, pts);

      const parts = [
        g.b2b && hard ? "b2b" : "",
        spun ? `t-spin ${LINE_NAMES[n]}` : LINE_NAMES[n],
        g.combo > 0 ? `combo ×${g.combo}` : "",
      ].filter(Boolean);
      say(g, parts.join(" · "));
      g.b2b = hard;

      g.clearing = full;
      g.clear_t = CLEAR_MS;
      g.phase = "clear";
      return;
    }

    g.combo = -1;
    if (spun) {
      add(g, 400 * g.level);
      say(g, "t-spin");
    }
    enter(g, pull(g));
  }

  function finish_clear(g: Game) {
    const keep = g.board.filter((_, y) => !g.clearing.includes(y));
    while (keep.length < HEIGHT) keep.unshift(Array<Cell>(COLS).fill(null));
    g.board = keep;
    g.lines += g.clearing.length;
    const lvl = Math.min(MAX_LEVEL, g.start_level + Math.floor(g.lines / PER_LEVEL));
    if (lvl > g.level) say(g, `level ${lvl}`);
    g.level = lvl;
    g.clearing = [];
    g.phase = "play";
    if (g.board.every((row) => row.every((c) => !c))) {
      add(g, 2000 * g.level);
      say(g, "perfect clear");
    }
    enter(g, pull(g));
  }

  function pause(g: Game, on: boolean) {
    if (g.phase !== "play" && g.phase !== "clear") return;
    g.paused = on;
    g.keys = {};
    g.dir = 0;
  }

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min(100, now - last);
      last = now;
      const g = game.current;
      let dirty = false;

      if (g.label_t > 0) {
        g.label_t -= dt;
        if (g.label_t <= 0) {
          g.label = "";
          dirty = true;
        }
      }

      if (!g.paused && g.phase === "clear") {
        g.clear_t -= dt;
        if (g.clear_t <= 0) finish_clear(g);
        dirty = true;
      } else if (!g.paused && g.phase === "play" && g.piece) {
        if (g.dir) {
          g.das_t += dt;
          if (g.das_t >= DAS) {
            g.arr_t += dt;
            while (g.arr_t >= ARR) {
              g.arr_t -= ARR;
              if (!shift(g, g.dir)) {
                g.arr_t = 0;
                break;
              }
              dirty = true;
            }
          }
        }

        const soft = !!g.keys.down;
        const speed = soft ? Math.min(SOFT, gravity(g.level)) : gravity(g.level);
        g.grav_t += dt;
        while (g.grav_t >= speed && g.piece) {
          g.grav_t -= speed;
          if (!fall(g, soft)) {
            g.grav_t = 0;
            break;
          }
          dirty = true;
        }

        if (g.piece && grounded(g)) {
          g.lock_t += dt;
          if (g.lock_t >= LOCK) {
            lock(g);
            dirty = true;
          }
        } else {
          g.lock_t = 0;
        }
      }

      if (dirty) render();
      raf = requestAnimationFrame(frame);
    }

    function on_down(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const g = game.current;

      if (k === "q") {
        e.preventDefault();
        done();
        return;
      }

      if (g.phase === "menu") {
        const menu: Record<string, () => void> = {
          arrowleft: () => (g.start_level = g.start_level <= 1 ? START_LEVELS : g.start_level - 1),
          a: () => (g.start_level = g.start_level <= 1 ? START_LEVELS : g.start_level - 1),
          arrowright: () => (g.start_level = g.start_level >= START_LEVELS ? 1 : g.start_level + 1),
          d: () => (g.start_level = g.start_level >= START_LEVELS ? 1 : g.start_level + 1),
          arrowup: () => (g.garbage = g.garbage >= GARBAGE ? 0 : g.garbage + 1),
          w: () => (g.garbage = g.garbage >= GARBAGE ? 0 : g.garbage + 1),
          arrowdown: () => (g.garbage = g.garbage <= 0 ? GARBAGE : g.garbage - 1),
          s: () => (g.garbage = g.garbage <= 0 ? GARBAGE : g.garbage - 1),
          " ": begin,
          enter: begin,
        };
        const fn = menu[k];
        if (!fn) return;
        e.preventDefault();
        fn();
        render();
        return;
      }

      if (g.phase === "over") {
        if (k === " " || k === "enter" || k === "r") {
          e.preventDefault();
          begin();
          render();
        } else if (k === "m") {
          e.preventDefault();
          const next = fresh(g);
          game.current = next;
          render();
        }
        return;
      }

      if (k === "p") {
        e.preventDefault();
        pause(g, !g.paused);
        render();
        return;
      }
      if (g.paused) {
        if (k === " " || k === "enter") {
          e.preventDefault();
          pause(g, false);
          render();
        }
        return;
      }
      if (e.repeat) {
        if (["arrowleft", "arrowright", "arrowdown", "a", "d", "s", " "].includes(k)) {
          e.preventDefault();
        }
        return;
      }

      const left = k === "arrowleft" || k === "a";
      const right = k === "arrowright" || k === "d";
      if (left || right) {
        e.preventDefault();
        const dir = left ? -1 : 1;
        g.keys[left ? "left" : "right"] = true;
        g.dir = dir;
        g.das_t = 0;
        g.arr_t = 0;
        if (g.phase === "play") shift(g, dir);
      } else if (k === "arrowdown" || k === "s") {
        e.preventDefault();
        if (!g.keys.down && g.phase === "play" && fall(g, true)) g.grav_t = 0;
        g.keys.down = true;
      } else if (k === "arrowup" || k === "w" || k === "x") {
        e.preventDefault();
        if (g.phase === "play") turn(g, true);
      } else if (k === "z") {
        e.preventDefault();
        if (g.phase === "play") turn(g, false);
      } else if (k === " ") {
        e.preventDefault();
        if (g.phase === "play") slam(g);
      } else if (k === "c" || k === "shift") {
        e.preventDefault();
        if (g.phase === "play") swap(g);
      } else {
        return;
      }
      render();
    }

    function on_up(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      const g = game.current;
      if (k === "arrowdown" || k === "s") g.keys.down = false;
      const left = k === "arrowleft" || k === "a";
      const right = k === "arrowright" || k === "d";
      if (!left && !right) return;
      g.keys[left ? "left" : "right"] = false;
      // fall back to the other direction if it's still held
      const other = left ? "right" : "left";
      if (g.keys[other]) {
        g.dir = left ? 1 : -1;
        g.das_t = 0;
        g.arr_t = 0;
      } else {
        g.dir = 0;
      }
    }

    function on_vis() {
      if (document.visibilityState !== "visible") {
        pause(game.current, true);
        render();
      }
    }

    function on_blur() {
      game.current.keys = {};
      game.current.dir = 0;
    }

    raf = requestAnimationFrame(frame);
    window.addEventListener("keydown", on_down);
    window.addEventListener("keyup", on_up);
    window.addEventListener("blur", on_blur);
    document.addEventListener("visibilitychange", on_vis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", on_down);
      window.removeEventListener("keyup", on_up);
      window.removeEventListener("blur", on_blur);
      document.removeEventListener("visibilitychange", on_vis);
    };
  }, [done]);

  const g = game.current;
  return g.phase === "menu" ? <Menu g={g} /> : <Board g={g} />;
}

type Look = { kind: Kind | null; ghost?: boolean; dim?: boolean; flash?: boolean };

function Tile({ kind, ghost, dim, flash }: Look) {
  if (flash) return <span className="m-px rounded-[2px] bg-[var(--term-bright)]" />;
  if (!kind) {
    return (
      <span className="flex items-center justify-center text-[10px] text-[var(--term-line)]">
        ·
      </span>
    );
  }
  if (ghost) {
    return (
      <span
        className="m-px rounded-[2px] border"
        style={{ borderColor: COLORS[kind], opacity: 0.45 }}
      />
    );
  }
  return (
    <span
      className="m-px rounded-[2px]"
      style={{ background: COLORS[kind], opacity: dim ? 0.3 : 1 }}
    />
  );
}

function Mini({ kind, dim = false }: { kind: Kind | null; dim?: boolean }) {
  const rows = kind ? SHAPES[kind].filter((r) => r.some(Boolean)) : [];
  const w = kind ? SHAPES[kind][0].length : 0;
  return (
    <div className="flex h-[1.7em] w-[3.4em] items-center justify-center">
      {kind ? (
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${w}, ${MINI})`, gridAutoRows: MINI }}
        >
          {rows.flatMap((r, y) =>
            r.map((c, x) =>
              c ? (
                <span
                  key={`${y}-${x}`}
                  className="m-px rounded-[1px]"
                  style={{ background: COLORS[kind], opacity: dim ? 0.3 : 1 }}
                />
              ) : (
                <span key={`${y}-${x}`} />
              ),
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function Menu({ g }: { g: Game }) {
  return (
    <div className="font-mono text-sm">
      <p className="mb-2 text-[13px] text-[var(--term-muted)]">
        ←→ level · ↑↓ garbage · space play · q quit
      </p>
      <div className="select-none space-y-3">
        <pre className="leading-tight text-[var(--term-bright)]">
          {KINDS.slice(0, 6).map((k, i) => (
            <span key={k} style={{ color: COLORS[k] }}>
              {"TETRIS"[i]}
            </span>
          ))}
        </pre>
        <div className="space-y-1">
          <div>
            level <span className="text-[var(--term-bright)]">{g.start_level}</span>
            <span className="text-[var(--term-muted)]">/{START_LEVELS}</span>
          </div>
          <div>
            garbage <span className="text-[var(--term-bright)]">{g.garbage}</span>
            <span className="text-[var(--term-muted)]">/{GARBAGE}</span>
          </div>
          <div>best {g.max.toLocaleString()}</div>
        </div>
        <div className="space-y-0.5 text-[13px] text-[var(--term-muted)]">
          <div>a/d ←→ move · s ↓ soft drop · space hard drop</div>
          <div>w ↑ x rotate · z rotate back · c shift hold · p pause</div>
        </div>
      </div>
    </div>
  );
}

function Board({ g }: { g: Game }) {
  const over = g.phase === "over";
  const p = g.piece;
  const ghost = p && !over ? drop_y(g.board, p) : null;

  const tiles: Look[] = [];
  for (let y = HIDDEN; y < HEIGHT; y++) {
    const flash = g.clearing.includes(y);
    for (let x = 0; x < COLS; x++) {
      const kind = g.board[y][x];
      if (flash) {
        tiles.push({ kind, flash });
        continue;
      }
      if (p && !over) {
        if (p.shape[y - p.y]?.[x - p.x]) {
          tiles.push({ kind: p.kind });
          continue;
        }
        if (!kind && ghost !== null && p.shape[y - ghost]?.[x - p.x]) {
          tiles.push({ kind: p.kind, ghost: true });
          continue;
        }
      }
      tiles.push({ kind, dim: over });
    }
  }

  const note = g.paused
    ? "paused · p to resume"
    : over
      ? `game over · ${g.best ? "new best! · " : ""}space retry · m menu`
      : "";

  return (
    <div className="font-mono text-sm">
      <p className="mb-2 text-[13px] text-[var(--term-muted)]">
        ←→ move · ↑ rotate · ↓ soft · space drop · c hold · p pause · q quit
      </p>
      <div className="flex gap-5 select-none">
        <div className="space-y-1 text-[13px]">
          <div className="text-[var(--term-muted)]">hold</div>
          <Mini kind={g.hold} dim={g.held} />
          <div className="pt-3 text-[var(--term-muted)]">score</div>
          <div className="text-[var(--term-bright)]">{g.score.toLocaleString()}</div>
          <div className="pt-1 text-[var(--term-muted)]">best</div>
          <div>{Math.max(g.max, g.score).toLocaleString()}</div>
          <div className="pt-1 text-[var(--term-muted)]">level</div>
          <div>{g.level}</div>
          <div className="pt-1 text-[var(--term-muted)]">lines</div>
          <div>{g.lines}</div>
        </div>
        <div className="relative self-start">
          <div
            className="grid rounded-[3px] border border-[var(--term-line)] p-[2px]"
            style={{
              gridTemplateColumns: `repeat(${COLS}, ${SIZE})`,
              gridAutoRows: SIZE,
              opacity: g.paused ? 0.25 : 1,
            }}
          >
            {tiles.map((t, i) => (
              <Tile key={i} {...t} />
            ))}
          </div>
          {g.label ? (
            <div
              className="absolute inset-x-0 top-[30%] text-center text-[13px] text-[var(--term-bright)]"
              style={{ opacity: Math.min(1, g.label_t / 400) }}
            >
              <span className="bg-[var(--term-bg)] px-1">{g.label}</span>
            </div>
          ) : null}
        </div>
        <div className="space-y-2 text-[13px]">
          <div className="text-[var(--term-muted)]">next</div>
          {g.queue.slice(0, PREVIEW).map((k, i) => (
            <div key={i} style={{ opacity: i === 0 ? 1 : 0.55 }}>
              <Mini kind={k} />
            </div>
          ))}
        </div>
      </div>
      {note ? (
        <p className={`mt-2 text-[13px] ${over ? "text-[var(--term-bright)]" : "text-[var(--term-muted)]"}`}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

function run(_args: string[], helpers: Helpers) {
  return <Tetris done={helpers.done} />;
}

const help = "Play tetris (space start, q quit)";
const group = "games";

export { run, help, group };
