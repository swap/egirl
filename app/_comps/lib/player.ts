import { useSyncExternalStore } from "react";

type LyricWord = { start: number; end: number; text: string };
type LyricLine = {
  start: number;
  end: number;
  text: string;
  words: LyricWord[];
};
type Lyric = {
  id: string;
  name?: string;
  artist?: string;
  sync: "none" | "line" | "word";
  lines: LyricLine[];
};

type Now = {
  id: string;
  name: string;
  artist: string;
  image: string;
  url: string;
  playing: boolean;
  progress: number;
  duration: number;
};

type Source = "live" | "track";

type Track = {
  id: string;
  name: string;
  artist: string;
  image: string;
  url: string;
  source: Source;
};

type Snapshot = {
  track: Track | null;
  live: Now | null;
  lyric: Lyric | null;
  playing: boolean;
  loading: boolean;
  ready: boolean;
  ms: number;
  at: number;
};

type Listener = () => void;

function pack_words(words: LyricWord[]) {
  const out: LyricWord[] = [];
  for (const w of words) {
    if (!w.text.trim()) {
      if (out.length) {
        out[out.length - 1].text += w.text;
        out[out.length - 1].end = Math.max(out[out.length - 1].end, w.end);
      }
      continue;
    }
    const prev = out[out.length - 1];
    if (prev && !/\s$/.test(prev.text) && !/^\s/.test(w.text)) {
      prev.text += w.text;
      prev.end = Math.max(prev.end, w.end);
      continue;
    }
    out.push({ ...w });
  }
  return out;
}

function fix_lyric(lyric: Lyric): Lyric {
  return {
    ...lyric,
    lines: lyric.lines.map((l) => ({
      ...l,
      words: pack_words(l.words || []),
    })),
  };
}

const listeners = new Set<Listener>();
let audio: HTMLAudioElement | null = null;
let es: EventSource | null = null;
let raf = 0;
let lyric_cache: Lyric | null = null;
let mark = { progress: 0, at: 0, playing: false };

let state: Snapshot = {
  track: null,
  live: null,
  lyric: null,
  playing: false,
  loading: false,
  ready: false,
  ms: 0,
  at: 0,
};

let seek_token = 0;
let seeking = false;
let live_armed = false;

function emit() {
  for (const fn of listeners) fn();
}

function set(partial: Partial<Snapshot>) {
  state = { ...state, ...partial };
  emit();
}

function stream_url(id: string) {
  return `/api/v2/music/stream?id=${id}`;
}

function live_ms() {
  if (!mark.at) return mark.progress || 0;
  return mark.playing
    ? mark.progress + Math.max(0, Date.now() - mark.at)
    : mark.progress;
}

function live_target_sec(el: HTMLAudioElement) {
  const ms = live_ms();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  let t = ms / 1000;
  const dur = el.duration;
  if (Number.isFinite(dur) && dur > 0) {
    t = Math.min(t, Math.max(0, dur - 0.35));
  }
  return t;
}

const wired = new WeakSet<HTMLAudioElement>();

function wire(el: HTMLAudioElement) {
  if (wired.has(el)) return;
  wired.add(el);
  el.preload = "auto";
  el.setAttribute("playsinline", "");
  el.addEventListener("play", () => {
    set({ playing: true, loading: false });
  });
  el.addEventListener("pause", () => {
    set({ playing: false });
  });
  el.addEventListener("waiting", () => {
    if (!el.paused && !seeking) set({ loading: true });
  });
  el.addEventListener("canplay", () => {
    set({ loading: false });
  });
  el.addEventListener("playing", () => {
    set({ loading: false, playing: true });
  });
  el.addEventListener("seeked", () => {
    if (!el.paused) set({ loading: false });
  });
  el.addEventListener("ended", () => {
    set({ playing: false, loading: false });
    if (state.track?.source === "track") resume_live();
  });
  el.addEventListener("error", () => {
    seeking = false;
    set({ playing: false, loading: false });
  });
}

function ensure_audio() {
  if (typeof document === "undefined") return null;
  if (audio?.isConnected) return audio;
  if (audio) {
    const host =
      document.getElementById("music-player-root") || document.body;
    host.appendChild(audio);
    return audio;
  }
  audio = document.createElement("audio");
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  audio.style.display = "none";
  const host =
    document.getElementById("music-player-root") || document.body;
  host.appendChild(audio);
  wire(audio);
  return audio;
}

function bind_audio(el: HTMLAudioElement | null) {
  if (!el) return;
  if (audio === el) {
    wire(el);
    return;
  }
  const prev = audio;
  const src = prev?.getAttribute("src") || "";
  const time = prev?.currentTime || 0;
  const was = Boolean(prev && !prev.paused);
  const armed = live_armed;
  audio = el;
  wire(el);
  if (src) {
    if (el.getAttribute("src") !== src) el.src = src;
    try {
      if (time > 0) el.currentTime = time;
    } catch {}
    if (was || armed) void el.play().catch(() => {});
  }
  if (prev && prev !== el) {
    prev.pause();
    prev.removeAttribute("src");
    if (prev.parentNode && prev.parentNode !== el.parentNode) {
      try {
        prev.remove();
      } catch {}
    }
  }
}

function keep_alive() {
  const el = ensure_audio();
  if (!el) return;
  sync_playing();
  if (!live_armed || !state.track) return;
  if (!el.getAttribute("src") && state.track.id) {
    bind_src(state.track.id, true);
  }
  if (!el.paused && !el.ended) {
    if (state.playing !== true) set({ playing: true, loading: false });
    return;
  }
  if (state.track.source === "live") {
    const token = seek_token;
    void seek_to_live(el, token).then(() => {
      if (token !== seek_token) return;
      void el.play()
        .then(() => set({ playing: true, loading: false }))
        .catch(() => {});
    });
    return;
  }
  void el
    .play()
    .then(() => set({ playing: true, loading: false }))
    .catch(() => {});
}

function bind_src(id: string, preload: boolean) {
  const el = ensure_audio();
  if (!el) return false;
  const next = stream_url(id);
  const changed = el.getAttribute("src") !== next;
  if (changed) {
    seek_token += 1;
    seeking = false;
    el.src = next;
    el.preload = preload ? "auto" : "metadata";
    el.load();
    return true;
  }
  if (preload) {
    if (el.preload !== "auto") el.preload = "auto";
    if (el.error || el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      seek_token += 1;
      seeking = false;
      el.load();
      return true;
    }
  }
  return false;
}

function wait_ready(el: HTMLAudioElement, token: number, ms = 12000) {
  if (el.readyState >= 2) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const done = (ok: boolean) => {
      el.removeEventListener("loadeddata", on);
      el.removeEventListener("canplay", on);
      el.removeEventListener("error", on_err);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const on = () => {
      if (token !== seek_token) return done(false);
      if (el.readyState >= 2) done(true);
    };
    const on_err = () => done(false);
    const timer = window.setTimeout(() => done(el.readyState >= 1), ms);
    el.addEventListener("loadeddata", on);
    el.addEventListener("canplay", on);
    el.addEventListener("error", on_err);
  });
}

function seek_to_live(el: HTMLAudioElement, token: number) {
  const t = live_target_sec(el);
  if (t <= 0) return Promise.resolve(true);
  if (Math.abs(el.currentTime - t) <= 0.75) {
    set({ ms: el.currentTime * 1000 });
    return Promise.resolve(true);
  }

  seeking = true;
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      seeking = false;
      el.removeEventListener("seeked", on_seeked);
      el.removeEventListener("error", on_err);
      window.clearTimeout(timer);
      set({ ms: el.currentTime * 1000, loading: false });
      resolve(ok);
    };
    const on_seeked = () => {
      if (token !== seek_token) return finish(false);
      finish(Math.abs(el.currentTime - t) <= 2.5);
    };
    const on_err = () => finish(false);
    const timer = window.setTimeout(() => {
      if (token !== seek_token) return finish(false);
      finish(Math.abs(el.currentTime - t) <= 3);
    }, 5000);

    el.addEventListener("seeked", on_seeked);
    el.addEventListener("error", on_err);
    try {
      el.currentTime = t;
      set({ ms: t * 1000 });
    } catch {
      finish(false);
    }
  });
}

function soft_resync() {
  if (seeking) return;
  const el = audio;
  if (!el || el.paused || state.track?.source !== "live") return;
  const t = live_target_sec(el);
  if (t <= 0) return;
  if (Math.abs(el.currentTime - t) <= 2.5) return;
  const token = seek_token;
  void seek_to_live(el, token);
}

function tick() {
  const el = audio;
  let next = 0;
  if (el && !el.paused && Number.isFinite(el.currentTime) && !seeking) {
    next = el.currentTime * 1000;
  } else if (state.track?.source === "live") {
    next = live_ms();
  } else if (el && Number.isFinite(el.currentTime)) {
    next = el.currentTime * 1000;
  }
  if (Math.abs(next - state.ms) >= 16) set({ ms: next });
  raf = requestAnimationFrame(tick);
}

function start_clock() {
  if (raf || typeof requestAnimationFrame === "undefined") return;
  raf = requestAnimationFrame(tick);
}

function apply_live(now: Now | null, lyric: Lyric | null, ready: boolean, at: number) {
  mark = now
    ? {
        progress: now.progress || 0,
        at: at || Date.now(),
        playing: now.playing,
      }
    : { progress: 0, at: 0, playing: false };

  const live_track: Track | null = now
    ? {
        id: now.id,
        name: now.name,
        artist: now.artist,
        image: now.image,
        url: now.url,
        source: "live",
      }
    : null;

  const on_live = !state.track || state.track.source === "live";
  if (on_live) {
    if (now) {
      const prev = state.track?.id;
      const same = prev === now.id;
      const was_playing = Boolean(
        live_armed || state.playing || (audio && !audio.paused),
      );
      const local = Boolean(audio && !audio.paused && same);
      if (prev && !same) {
        seek_token += 1;
        seeking = false;
        ensure_audio()?.pause();
      }
      if (ready || same) bind_src(now.id, ready);
      set({
        live: now,
        track: live_track,
        lyric,
        ready,
        at,
        ms: local ? state.ms : now.progress || 0,
        ...(prev && !same
          ? {
              playing: false,
              loading: was_playing && now.playing,
            }
          : {}),
      });
      if (prev && !same && was_playing && now.playing) {
        void play_live();
      } else if (local) {
        soft_resync();
      }
    } else {
      seek_token += 1;
      seeking = false;
      live_armed = false;
      const el = ensure_audio();
      if (el) {
        el.pause();
        el.removeAttribute("src");
      }
      set({
        live: null,
        track: null,
        lyric: null,
        ready: false,
        playing: false,
        loading: false,
        ms: 0,
        at: 0,
      });
    }
    return;
  }

  set({ live: now, at });
}

function resume_live() {
  const now = state.live;
  if (!now) {
    set({ track: null, lyric: null, playing: false, loading: false });
    return;
  }
  bind_src(now.id, state.ready);
  set({
    track: {
      id: now.id,
      name: now.name,
      artist: now.artist,
      image: now.image,
      url: now.url,
      source: "live",
    },
    lyric: lyric_cache?.id === now.id ? lyric_cache : state.lyric,
    playing: false,
    loading: false,
    ms: live_ms(),
  });
}

function connect_live() {
  if (typeof EventSource === "undefined" || es) return;
  es = new EventSource("/api/v2/music/now");
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as {
        now?: Now | null;
        lyric?: Lyric | null;
        audio?: boolean;
        at?: number;
      };
      if (!data.now) {
        lyric_cache = null;
        apply_live(null, null, false, 0);
        return;
      }
      if (data.lyric && data.lyric.sync !== "none") {
        lyric_cache = fix_lyric(data.lyric);
      } else if (lyric_cache?.id !== data.now.id) {
        lyric_cache = null;
      }
      apply_live(
        data.now,
        lyric_cache,
        Boolean(data.audio),
        data.at || Date.now(),
      );
    } catch {}
  };
}

async function load_lyric(id: string) {
  try {
    const r = await fetch(`/api/v2/music/lyric?id=${id}`);
    if (!r.ok) return null;
    const d = (await r.json()) as Lyric | null;
    if (!d || d.sync === "none") return null;
    return fix_lyric(d);
  } catch {
    return null;
  }
}

let booted = false;

function boot() {
  connect_live();
  start_clock();
  if (booted || typeof document === "undefined") return;
  booted = true;
  const kick = () => keep_alive();
  document.addEventListener("astro:page-load", kick);
  document.addEventListener("astro:after-swap", kick);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") kick();
  });
}

async function play_live() {
  const now = state.live;
  if (!now) return;
  const el = ensure_audio();
  if (!el) return;

  const token = ++seek_token;
  seeking = false;
  live_armed = true;
  set({
    track: {
      id: now.id,
      name: now.name,
      artist: now.artist,
      image: now.image,
      url: now.url,
      source: "live",
    },
    lyric: lyric_cache?.id === now.id ? lyric_cache : null,
    loading: true,
    ms: live_ms(),
  });

  const started = Date.now();
  while (!state.ready && state.live?.id === now.id && token === seek_token) {
    if (Date.now() - started > 25000) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  if (token !== seek_token || state.live?.id !== now.id) {
    set({ loading: false });
    return;
  }

  bind_src(now.id, true);
  const ready = await wait_ready(el, token, 20000);
  if (!ready || token !== seek_token) {
    set({ loading: false });
    return;
  }
  if (state.track?.id !== now.id || state.track.source !== "live") {
    set({ loading: false });
    return;
  }

  await seek_to_live(el, token);
  if (token !== seek_token) {
    set({ loading: false });
    return;
  }

  try {
    await el.play();
    live_armed = true;
    set({ loading: false, playing: true, ms: el.currentTime * 1000 });
  } catch {
    live_armed = false;
    set({ loading: false });
  }
}

async function play_track(input: Omit<Track, "source"> & { lyric?: Lyric | null }) {
  const el = ensure_audio();
  if (!el) return;

  const same =
    state.track?.source === "track" &&
    state.track.id === input.id &&
    el.getAttribute("src") === stream_url(input.id);

  if (same) {
    if (el.paused) {
      set({ loading: el.readyState < 3 });
      void el.play().catch(() => set({ loading: false }));
    } else el.pause();
    return;
  }

  el.pause();
  live_armed = false;
  bind_src(input.id, true);
  set({
    track: { ...input, source: "track" },
    lyric: input.lyric || null,
    loading: true,
    playing: false,
    ms: 0,
  });

  if (!input.lyric) {
    void load_lyric(input.id).then((lyric) => {
      if (state.track?.id === input.id && state.track.source === "track") {
        set({ lyric });
      }
    });
  }

  try {
    el.currentTime = 0;
  } catch {}
  void el.play().catch(() => set({ loading: false }));
}

function toggle() {
  const el = ensure_audio();
  const track = state.track;
  if (!el || !track) return;

  if (!el.paused) {
    live_armed = false;
    el.pause();
    set({ loading: false, playing: false });
    return;
  }

  if (track.source === "live") {
    void play_live();
    return;
  }

  set({ loading: el.readyState < 3 });
  void el.play().catch(() => set({ loading: false }));
}

function pause() {
  live_armed = false;
  ensure_audio()?.pause();
}

function sync_playing() {
  const el = audio;
  if (!el) return;
  const on = !el.paused && !el.ended;
  if (state.playing !== on) set({ playing: on });
}

function seek(seconds: number) {
  const el = ensure_audio();
  if (!el || !Number.isFinite(seconds)) return;
  try {
    el.currentTime = Math.max(0, seconds);
    set({ ms: el.currentTime * 1000 });
  } catch {}
}

function set_volume(v: number, muted = false) {
  const el = ensure_audio();
  if (!el) return;
  el.volume = Math.min(1, Math.max(0, v));
  el.muted = muted;
}

function get_audio() {
  return ensure_audio();
}

function get_state() {
  return state;
}

function subscribe(fn: Listener) {
  listeners.add(fn);
  boot();
  return () => {
    listeners.delete(fn);
  };
}

function usePlayer(): Snapshot {
  return useSyncExternalStore(subscribe, get_state, get_state);
}

export type { Lyric, LyricLine, LyricWord, Now, Snapshot, Source, Track };
export {
  bind_audio,
  fix_lyric,
  get_audio,
  get_state,
  keep_alive,
  pause,
  play_live,
  play_track,
  resume_live,
  seek,
  set_volume,
  subscribe,
  sync_playing,
  toggle,
  usePlayer,
};
