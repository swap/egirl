import { useState } from "react";
import { Music2 } from "lucide-react";

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function num(n: number) {
  return n.toLocaleString("en-US");
}

export function Img({ src, className = "" }: { src: string; className?: string }) {
  const [on, setOn] = useState(false);
  return (
    <img
      key={src}
      src={src}
      alt=""
      draggable={false}
      ref={(el) => {
        if (el?.complete && el.naturalWidth) setOn(true);
      }}
      onLoad={() => setOn(true)}
      className={`fade ${on ? "on" : ""} ${className}`}
    />
  );
}

export function Cover({ src, className = "" }: { src: string; className?: string }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.04] ${className}`}
    >
      <Music2
        className="absolute top-1/2 left-1/2 h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 text-[var(--white)]/20"
        strokeWidth={1.5}
      />
      {src ? <Img src={src} className="absolute inset-0 h-full w-full object-cover" /> : null}
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-[17px] font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-[12px] text-[var(--white)]/40">{label}</p>
    </div>
  );
}

export function track_id(url: string) {
  return url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/)?.[1] || "";
}

export function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Empty({ text = "nothing here yet" }: { text?: string }) {
  return (
    <div className="rise flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[var(--white)]/[0.1]">
      <p className="text-[14px] text-[var(--white)]/40">{text}</p>
    </div>
  );
}
