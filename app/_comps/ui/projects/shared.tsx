import { useState, type CSSProperties } from "react";

export type Person = {
  name: string;
  github: string;
  login?: string;
  avatar?: string;
  url?: string;
};

export type Item = {
  name: string;
  description?: string;
  support?: string;
  url?: string;
  site?: string;
  github?: string;
  date?: string | number;
  version?: string;
  logo?: string;
  banner?: string;
  tags?: string[];
  with?: Person[];
};

export type Data = {
  projects?: Item[];
  small?: Item[];
  contributions?: Item[];
  older?: Item[];
};

export type Kind = "projects" | "smaller" | "older" | "collabs";

export function gh(v?: string) {
  if (!v) return "";
  return v.startsWith("http") ? v : `https://github.com/${v}`;
}

export function year(v?: string | number) {
  if (v == null || v === "") return "";
  return String(v).slice(0, 4);
}

export function yr(v?: string | number) {
  const y = Number(year(v));
  return Number.isFinite(y) ? y : 0;
}

export function is_old(item: Item) {
  return yr(item.date) > 0 && yr(item.date) < 2025;
}

export function site_of(item: Item) {
  return item.url || item.site || "";
}

export function repo_of(v?: string) {
  const u = gh(v);
  if (!u) return "";
  return u.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
}

export function when_of(v?: string | number) {
  if (v == null || v === "") return "";
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m) {
    const months = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    const mo = months[Number(m[2]) - 1];
    return mo ? `${mo} ${m[1]}` : m[1];
  }
  return s.slice(0, 4);
}

export function person_href(p: Person) {
  if (p.url) return p.url;
  if (p.login) return `https://github.com/${p.login}`;
  if (p.github) return gh(p.github);
  return "";
}

export function person_avatar(p: Person) {
  if (p.avatar) return p.avatar;
  const login = p.login || (p.github ? gh(p.github).replace(/^https?:\/\/github\.com\//, "") : "");
  return login ? `https://github.com/${login}.png?size=96` : "";
}

export function Img({
  src,
  className = "",
  style,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [on, setOn] = useState(false);
  return (
    <img
      key={src}
      src={src}
      alt=""
      draggable={false}
      style={style}
      ref={(el) => {
        if (el?.complete && el.naturalWidth) setOn(true);
      }}
      onLoad={() => setOn(true)}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
      className={`fade ${on ? "on" : ""} ${className}`}
    />
  );
}

export function SoftLogo({
  src,
  name,
  size = "md",
}: {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  if (!src) {
    return (
      <span
        className={`flex ${box} shrink-0 items-center justify-center text-[10px] font-semibold text-[var(--white)]/35`}
      >
        {name.trim().slice(0, 1).toLowerCase() || "·"}
      </span>
    );
  }
  return <Img src={src} className={`${box} shrink-0 object-cover`} />;
}
