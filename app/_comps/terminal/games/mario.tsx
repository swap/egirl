import { useEffect, useRef } from "react";
import type { Helpers } from "@/app/_comps/lib/commands";

const KEYS: Record<string, string> = {
  arrowleft: "LEFT",
  a: "LEFT",
  arrowright: "RIGHT",
  d: "RIGHT",
  arrowup: "JUMP",
  w: "JUMP",
  " ": "JUMP",
  k: "JUMP",
  arrowdown: "DOWN",
  s: "DOWN",
  shift: "RUN",
  j: "RUN",
};

type Game = Window & {
  input?: { set: (k: string, s: boolean) => void; reset: () => void };
  marioDead?: boolean;
};

function Mario({ done }: Helpers) {
  const frame = useRef<HTMLIFrameElement>(null);

  function win() {
    return frame.current?.contentWindow as Game | null | undefined;
  }

  function restart() {
    const el = frame.current;
    if (!el) return;
    el.src = "/mario/index.html?v=4";
  }

  useEffect(() => {
    function on_down(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();

      if (k === "q") {
        e.preventDefault();
        done();
        return;
      }

      if (k === "r" || (win()?.marioDead && (KEYS[k] || k === "enter"))) {
        e.preventDefault();
        if (!e.repeat) restart();
        return;
      }

      const name = KEYS[k];
      if (!name) return;
      e.preventDefault();
      win()?.input?.set(name, true);
    }

    function on_up(e: KeyboardEvent) {
      const name = KEYS[e.key.toLowerCase()];
      if (!name) return;
      e.preventDefault();
      win()?.input?.set(name, false);
    }

    // drop held keys so mario doesn't keep running after alt-tab
    function on_blur() {
      win()?.input?.reset();
    }

    window.addEventListener("keydown", on_down);
    window.addEventListener("keyup", on_up);
    window.addEventListener("blur", on_blur);
    return () => {
      window.removeEventListener("keydown", on_down);
      window.removeEventListener("keyup", on_up);
      window.removeEventListener("blur", on_blur);
    };
  }, [done]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <p className="text-[13px] text-[var(--term-muted)]">
        ←→ move · space/↑ jump · shift run/fire · ↓ crouch/pipe · r restart · q quit
      </p>
      <iframe
        ref={frame}
        src="/mario/index.html?v=4"
        title="mario"
        tabIndex={-1}
        className="pointer-events-none min-h-0 w-full flex-1 border border-[var(--term-line)] bg-[var(--black)]"
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
