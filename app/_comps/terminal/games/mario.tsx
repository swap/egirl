import { useEffect, useRef } from "react";
import type { Helpers } from "@/app/_comps/lib/commands";

const KEYS: Record<string, string> = {
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  a: "LEFT",
  A: "LEFT",
  d: "RIGHT",
  D: "RIGHT",
  ArrowUp: "JUMP",
  w: "JUMP",
  W: "JUMP",
  " ": "JUMP",
};

function Mario({ done }: Helpers) {
  const frame = useRef<HTMLIFrameElement>(null);

  function win() {
    return frame.current?.contentWindow as
      | (Window & {
          input?: { set: (k: string, s: boolean) => void; reset: () => void };
          marioDead?: boolean;
        })
      | null
      | undefined;
  }

  function restart() {
    const el = frame.current;
    if (!el) return;
    el.src = "/mario/index.html?v=3";
  }

  useEffect(() => {
    function on_down(e: KeyboardEvent) {
      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        done();
        return;
      }

      if (win()?.marioDead) {
        e.preventDefault();
        restart();
        return;
      }

      const name = KEYS[e.key];
      if (!name) return;
      e.preventDefault();
      win()?.input?.set(name, true);
    }

    function on_up(e: KeyboardEvent) {
      const name = KEYS[e.key];
      if (!name) return;
      e.preventDefault();
      win()?.input?.set(name, false);
    }

    window.addEventListener("keydown", on_down);
    window.addEventListener("keyup", on_up);
    return () => {
      window.removeEventListener("keydown", on_down);
      window.removeEventListener("keyup", on_up);
    };
  }, [done]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <p className="text-[13px] text-[var(--term-muted)]">
        a/d or arrows · space/w/up jump · any key retry · q quit
      </p>
      <iframe
        ref={frame}
        src="/mario/index.html?v=3"
        title="mario"
        className="min-h-0 w-full flex-1 border border-[var(--term-line)] bg-[var(--black)]"
      />
    </div>
  );
}

function run(_args: string[], helpers: Helpers) {
  return <Mario done={helpers.done} />;
}

const help = "Play mario (q quit)";
const group = "games";

export { run, help, group };
