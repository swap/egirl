import { useEffect, useState } from "react";
import SpecularButton from "@/app/_comps/ui/button";
import { icon_src } from "@/app/_comps/ui/small-widget";

type Sponsor = {
  enabled?: boolean;
  name?: string;
  icon?: string;
  description?: string;
  colors?: string[];
  url?: string;
};

function useSponsor() {
  const [data, setData] = useState<Sponsor | null>(null);

  useEffect(() => {
    void fetch("/api/v2/sponsor")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((json: Sponsor) => setData(json))
      .catch(() => setData({ enabled: false }));
  }, []);

  return data;
}

function active(s: Sponsor | null) {
  if (!s) return false;
  if (s.enabled === false) return false;
  if (!s.url?.trim()) return false;
  if (!s.name?.trim()) return false;
  return true;
}

function rgba(c: string, a: number) {
  const h = c.replace("#", "").trim();
  if (h.length !== 6) return `rgba(247,247,247,${a})`;
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return `rgba(247,247,247,${a})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function mix(c: string, into: string, t: number) {
  const parse = (x: string) => {
    const h = x.replace("#", "").trim();
    if (h.length !== 6) return [23, 23, 23];
    const n = Number.parseInt(h, 16);
    if (Number.isNaN(n)) return [23, 23, 23];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(c);
  const [r2, g2, b2] = parse(into);
  const r = Math.round(r1 * t + r2 * (1 - t));
  const g = Math.round(g1 * t + g2 * (1 - t));
  const b = Math.round(b1 * t + b2 * (1 - t));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function SponsorBadge({ className = "" }: { className?: string }) {
  const s = useSponsor();
  if (!active(s)) return null;

  const name = s!.name!.trim();
  const src = icon_src(s!.icon);
  const accent = s!.colors?.[0]?.trim() || "#1ebfbf";
  const glow = s!.colors?.[1]?.trim() || accent;

  return (
    <SpecularButton
      size="sm"
      radius={7}
      href={s!.url}
      target="_blank"
      autoAnimate={false}
      followMouse
      proximity={140}
      intensity={1.25}
      shineSize={12}
      tint={accent}
      tintOpacity={0}
      lineColor={glow}
      baseColor={accent}
      textColor={mix(accent, "#f7f7f7", 0.18)}
      style={{
        background: [
          `radial-gradient(100% 120% at 50% 0%, ${rgba(accent, 0.14)}, transparent 60%)`,
          `linear-gradient(165deg, ${mix(accent, "#171717", 0.1)} 0%, #121212 70%, #0e0e0e 100%)`,
        ].join(", "),
        boxShadow: [
          `inset 0 1px 0 ${rgba("#ffffff", 0.06)}`,
          `inset 0 0 12px ${rgba(accent, 0.08)}`,
        ].join(", "),
      }}
      className={`text-[14px] font-medium tracking-[-0.01em] active:scale-100 ${className || "!min-w-[9.5rem] !px-8 !py-1.5"}`}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="h-4 w-4 shrink-0 object-contain opacity-90"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span>{name.toLowerCase()}</span>
    </SpecularButton>
  );
}

export { useSponsor, active, SponsorBadge };
export type { Sponsor };
