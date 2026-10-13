import { Music2 } from "lucide-react";

export function Disc({ out, spin }: { out: boolean; spin: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-[2.5%] rounded-full transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
        out ? "translate-x-5" : ""
      }`}
    >
      <div
        className="relative h-full w-full animate-[spin_7s_linear_infinite] rounded-full border border-[var(--white)]/[0.12] bg-[#1a1a1a] shadow-[0_12px_28px_-10px_#000000]"
        style={{ animationPlayState: spin ? "running" : "paused" }}
      >
        <div className="absolute inset-[7%] rounded-full bg-[repeating-radial-gradient(circle,#1c1c1c_0_1.5px,#252525_1.5px_3px)]" />
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#f7f7f716_40deg,transparent_95deg,transparent_180deg,#f7f7f70c_225deg,transparent_275deg)]" />
        <div className="absolute inset-[33%] flex items-center justify-center rounded-full border border-[var(--white)]/[0.14] bg-[#171717]">
          <Music2 className="h-[53%] w-[53%] text-[var(--white)]/75" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
