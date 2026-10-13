import { useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { seek as seek_to } from "@/app/_comps/lib/player";
import { fmt } from "@/app/_comps/ui/music/shared";

type Props = {
  mine: boolean;
  playing: boolean;
  time: number;
  dur: number;
  vol: number;
  muted: boolean;
  onToggle: () => void;
  onVol: (v: number) => void;
  onMuted: (v: boolean) => void;
  onDur?: never;
};

export function MusicBar({
  mine,
  playing,
  time,
  dur,
  vol,
  muted,
  onToggle,
  onVol,
  onMuted,
}: Props) {
  const [drag, setDrag] = useState<number | null>(null);
  const bar = useRef<HTMLDivElement>(null);

  function ratio(e: { clientX: number }) {
    const el = bar.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  }

  function scrub_start(e: PointerEvent<HTMLDivElement>) {
    if (!dur || !mine) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(ratio(e) * dur);
  }

  function scrub_move(e: PointerEvent<HTMLDivElement>) {
    if (drag === null || !dur) return;
    setDrag(ratio(e) * dur);
  }

  function scrub_end() {
    if (drag !== null && mine) seek_to(drag);
    setDrag(null);
  }

  function skip(s: number) {
    if (!mine || !dur) return;
    seek_to(Math.min(dur, Math.max(0, time + s)));
  }

  const shown = drag ?? time;
  const pct = dur ? (shown / dur) * 100 : 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex w-full items-center gap-3">
        <button
          type="button"
          onClick={() => skip(-10)}
          aria-label="Back 10 seconds"
          disabled={!dur}
          className="cursor-pointer text-[var(--white)]/45 outline-none transition-colors hover:text-[var(--white)] disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--white)] text-[var(--black)] outline-none transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50"
        >
          {playing ? (
            <Pause className="h-4 w-4 fill-current" strokeWidth={0} />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" strokeWidth={0} />
          )}
        </button>
        <button
          type="button"
          onClick={() => skip(10)}
          aria-label="Forward 10 seconds"
          disabled={!dur}
          className="cursor-pointer text-[var(--white)]/45 outline-none transition-colors hover:text-[var(--white)] disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50"
        >
          <RotateCw className="h-4 w-4" strokeWidth={1.75} />
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onMuted(!muted)}
            aria-label={muted ? "Unmute" : "Mute"}
            className="cursor-pointer text-[var(--white)]/45 outline-none transition-colors hover:text-[var(--white)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50"
          >
            {muted || vol === 0 ? (
              <VolumeX className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Volume2 className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : vol}
            onChange={(e) => {
              onVol(Number(e.target.value));
              onMuted(false);
            }}
            aria-label="Volume"
            className="fav-range h-1 w-24 cursor-pointer appearance-none rounded-full outline-none"
            style={{
              background: `linear-gradient(90deg, var(--white) ${
                (muted ? 0 : vol) * 100
              }%, color-mix(in srgb, var(--white) 15%, transparent) ${
                (muted ? 0 : vol) * 100
              }%)`,
            }}
          />
        </div>
      </div>

      <div className="flex w-full items-center gap-3">
        <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-[var(--white)]/45">
          {fmt(shown)}
        </span>
        <div
          ref={bar}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur)}
          aria-valuenow={Math.round(shown)}
          tabIndex={0}
          onPointerDown={scrub_start}
          onPointerMove={scrub_move}
          onPointerUp={scrub_end}
          onPointerCancel={scrub_end}
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === "ArrowLeft") skip(-5);
            if (e.key === "ArrowRight") skip(5);
          }}
          className="group/bar relative flex h-5 min-w-0 flex-1 cursor-pointer items-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50"
        >
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-[var(--white)]/15 transition-[height] duration-150 group-hover/bar:h-1.5">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--white)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div
            className={`absolute h-3 w-3 -translate-x-1/2 rounded-full bg-[var(--white)] shadow-[0_0_0_3px_#171717] transition-opacity duration-150 ${
              drag !== null ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100"
            }`}
            style={{ left: `${pct}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-[11px] tabular-nums text-[var(--white)]/45">
          {fmt(dur)}
        </span>
      </div>
    </div>
  );
}
