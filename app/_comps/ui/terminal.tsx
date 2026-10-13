import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { bugs, get } from "@/app/_comps/lib/commands";

let nid = 0;

type InfoRow = { label: string; value: string };

type Props = {
  onClose?: () => void;
};

type Line = {
  id: number;
  kind: "in" | "out" | "err";
  text: string;
};

type Stack = {
  framework?: string;
  lib?: string;
  runtime?: string;
  css?: string;
  uptime?: number;
  date?: string;
  tz?: string;
};

type Me = {
  name?: string;
  host?: string;
  timezone?: string;
  stack?: Stack;
};

function fmt_up(sec: number) {
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600) % 24;
  const d = Math.floor(sec / 86400);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${s}s`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function ua_os() {
  const ua = navigator.userAgent;
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown";
}

function Dots() {
  const shades = [
    "bg-[var(--white)]/90",
    "bg-[var(--white)]/70",
    "bg-[var(--white)]/55",
    "bg-[var(--white)]/40",
    "bg-[var(--white)]/28",
    "bg-[var(--white)]/18",
    "bg-[var(--white)]/10",
  ];
  return (
    <div className="flex gap-1.5 py-1">
      {shades.map((c, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${c}`} />
      ))}
    </div>
  );
}

function Fetch({
  me,
  opened,
}: {
  me: Me | null;
  opened: number;
}) {
  const user = (me?.name || "tess").toLowerCase();
  const host = me?.host || "egirl";
  const s = me?.stack;
  const session = (Date.now() - opened) / 1000;

  const rows: InfoRow[] = [
    { label: "framework", value: s?.framework || "…" },
    { label: "lib", value: s?.lib || "…" },
    { label: "runtime", value: s?.runtime || "…" },
    { label: "css", value: s?.css || "…" },
    {
      label: "uptime",
      value: s?.uptime != null ? fmt_up(s.uptime) : "…",
    },
    { label: "session", value: fmt_up(session) },
    { label: "font", value: "JetBrains Mono" },
    { label: "date", value: s?.date || new Date().toISOString().slice(0, 10) },
    { label: "guest", value: `${ua_os()} · ${navigator.language}` },
    { label: "tz", value: s?.tz || me?.timezone || "…" },
  ];

  const label_w = Math.max(...rows.map((r) => r.label.length));

  return (
    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="mx-auto w-[min(100%,220px)] shrink-0 sm:mx-0">
        <img
          src="/images/web/terminal.png"
          alt=""
          className="h-auto w-full object-contain select-none"
          draggable={false}
        />
      </div>
      <div className="min-w-0 flex-1 text-[13px] leading-6 sm:text-[14px]">
        <Dots />
        <div className="mb-1 font-medium text-[var(--term-bright)]">
          {user}
          <span className="text-[var(--term-muted)]">@</span>
          {host}
        </div>
        <div className="mb-2 text-[var(--term-muted)]">
          {"-".repeat(user.length + host.length + 1)}
        </div>
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2">
            <span
              className="shrink-0 text-[var(--term-bright)]"
              style={{ width: `${label_w}ch` }}
            >
              {r.label}
            </span>
            <span className="text-[var(--term-muted)]">-</span>
            <span className="min-w-0 break-words text-[var(--term-fg)]">
              {r.value}
            </span>
          </div>
        ))}
        <div className="mt-2">
          <Dots />
        </div>
      </div>
    </div>
  );
}

function Terminal({ onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const [lines, set_lines] = useState<Line[]>(() =>
    bugs.map((b) => ({ id: ++nid, kind: "err" as const, text: b })),
  );
  const [value, set_value] = useState("");
  const [busy, set_busy] = useState(false);
  const [view, set_view] = useState<ReactNode>(null);
  const [fetch_on, set_fetch_on] = useState(true);
  const [me, set_me] = useState<Me | null>(null);
  const [opened, set_opened] = useState(() => Date.now());
  const [cols, set_cols] = useState(80);
  const [rows, set_rows] = useState(24);
  const done_ref = useRef(() => {});

  done_ref.current = () => {
    set_view(null);
    queueMicrotask(() => input.current?.focus());
  };

  function load_me() {
    return fetch("/api/v2/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && set_me(d as Me))
      .catch(() => {});
  }

  useEffect(() => {
    void load_me();
  }, []);

  useEffect(() => {
    function measure() {
      const el = scroll.current;
      if (!el) return;
      const fs = 14;
      const lh = 1.45;
      set_cols(Math.max(20, Math.floor(el.clientWidth / (fs * 0.6))));
      set_rows(Math.max(8, Math.floor(el.clientHeight / (fs * lh))));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [view, fetch_on]);

  useEffect(() => {
    panel.current?.focus();
    input.current?.focus();

    function on_key(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (mod && (k === "c" || k === "v" || k === "x" || k === "a")) {
        return;
      }

      if (e.key !== "Escape") return;
      e.preventDefault();
      if (view) done_ref.current();
      else onClose?.();
    }

    function on_paste(e: ClipboardEvent) {
      if (view || busy) return;
      if (e.target === input.current) return;
      const text = e.clipboardData?.getData("text");
      if (!text) return;
      e.preventDefault();
      const flat = text.replace(/\r?\n/g, " ");
      set_value((v) => v + flat);
      input.current?.focus();
    }

    window.addEventListener("keydown", on_key);
    document.addEventListener("paste", on_paste);
    return () => {
      window.removeEventListener("keydown", on_key);
      document.removeEventListener("paste", on_paste);
    };
  }, [onClose, view, busy]);

  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight });
  }, [lines, view, fetch_on]);

  function push(kind: Line["kind"], text: string) {
    set_lines((prev) => [...prev, { id: ++nid, kind, text }]);
  }

  function has_sel() {
    const s = window.getSelection();
    return !!s && s.toString().length > 0;
  }

  async function exec(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    push("in", trimmed);
    const [name, ...args] = trimmed.split(/\s+/);
    const key = name.toLowerCase();

    if (key === "clear") {
      set_lines([]);
      set_fetch_on(false);
      return;
    }
    if (key === "clean") {
      set_lines([]);
      set_view(null);
      set_fetch_on(true);
      set_opened(Date.now());
      set_me(null);
      void load_me();
      queueMicrotask(() => input.current?.focus());
      return;
    }
    if (key === "exit" || key === "quit") {
      onClose?.();
      return;
    }

    const cmd = get(key);
    if (!cmd) {
      push("err", `tml: command not found: ${name}`);
      return;
    }

    set_busy(true);
    try {
      const result = await cmd.run(args, { done: () => done_ref.current() });
      if (typeof result === "string") {
        if (result) {
          for (const line of result.split("\n")) push("out", line);
        }
      } else if (result != null) {
        set_view(result);
      }
    } catch (err) {
      push("err", err instanceof Error ? err.message : String(err));
    } finally {
      set_busy(false);
    }
  }

  function on_submit(e: FormEvent) {
    e.preventDefault();
    if (busy || view) return;
    const next = value;
    set_value("");
    void exec(next);
  }

  const who = (me?.name || "tess").toLowerCase();
  const prompt = (
    <span className="shrink-0">
      <span className="text-[var(--term-muted)]">[</span>
      <span className="text-[var(--term-bright)]">guest</span>
      <span className="text-[var(--term-muted)]">@</span>
      <span className="text-[var(--term-bright)]">egirl</span>
      <span className="text-[var(--term-muted)]"> </span>
      <span className="text-[var(--term-fg)]">~</span>
      <span className="text-[var(--term-muted)]">]$</span>
      <span className="text-[var(--term-muted)]">{"\u00A0"}</span>
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-[3px] sm:items-center sm:p-8"
      onClick={onClose}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-label="terminal"
        className="term relative flex h-[min(42rem,92vh)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[var(--term-line)] bg-[var(--term-bg)]/95 text-[var(--term-fg)] shadow-[0_30px_100px_rgba(0,0,0,0.65)] outline-none select-text"
        onClick={(e) => {
          e.stopPropagation();
          if (view || has_sel()) return;
          input.current?.focus();
        }}
      >
        <div className="absolute inset-x-0 top-0 z-20 flex h-9 items-center gap-3 border-b border-white/10 bg-black/35 pr-2 pl-3 text-[12px] text-[var(--term-muted)] backdrop-blur-md backdrop-saturate-150">
          <span className="min-w-0 flex-1 truncate">
            {who}@egirl:~ | {cols}x{rows}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {view ? (
              <button
                type="button"
                className="cursor-pointer rounded-md px-2 py-1 text-[11px] tracking-wide hover:bg-white/10 hover:text-[var(--term-bright)]"
                onClick={() => done_ref.current()}
              >
                back
              </button>
            ) : null}
            <button
              type="button"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[15px] leading-none text-[var(--term-muted)] transition-colors hover:bg-white/12 hover:text-[var(--term-bright)]"
              onClick={onClose}
              aria-label="close"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2.5 2.5l7 7M9.5 2.5l-7 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={scroll}
          className={
            view
              ? "term-scroll flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-11 pb-3 text-[14px] leading-[1.45] sm:px-5"
              : "term-scroll flex min-h-0 flex-1 flex-col overflow-auto px-4 pt-11 pb-3 text-[14px] leading-[1.45] sm:px-5"
          }
        >
          {view ? (
            <div className="min-h-0 flex-1 text-[var(--term-fg)]">{view}</div>
          ) : (
            <>
              {fetch_on ? <Fetch me={me} opened={opened} /> : null}
              {lines.map((line) => (
                <div
                  key={line.id}
                  className={
                    line.kind === "err"
                      ? "whitespace-pre-wrap break-words text-[var(--term-muted)]"
                      : "whitespace-pre-wrap break-words text-[var(--term-fg)]"
                  }
                >
                  {line.kind === "in" ? (
                    <>
                      {prompt}
                      {line.text}
                    </>
                  ) : (
                    line.text || "\u00A0"
                  )}
                </div>
              ))}
              <form onSubmit={on_submit} className="flex min-w-0 items-start">
                {prompt}
                <div className="relative min-w-0 flex-1">
                  <input
                    ref={input}
                    value={value}
                    disabled={busy}
                    onChange={(e) => set_value(e.target.value)}
                    className={
                      !value && !busy
                        ? "w-full bg-transparent text-[var(--term-bright)] caret-transparent outline-none disabled:opacity-40"
                        : "w-full bg-transparent text-[var(--term-bright)] caret-[var(--term-bright)] outline-none disabled:opacity-40"
                    }
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="command"
                  />
                  {!value && !busy ? (
                    <span className="term-caret pointer-events-none absolute top-[0.1em] left-0 h-[1.1em] w-[0.6ch] bg-[var(--term-bright)]" />
                  ) : null}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { Terminal };