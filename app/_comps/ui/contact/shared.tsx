import { useState } from "react";
import { Tile } from "@/app/_comps/ui/glass";
import { Telegram } from "@/app/_comps/ui/icons";

export type Me = {
  name: string;
  telegram: string;
  github: string;
  email: string;
  dolls: string;
  avatar: string;
  timezone: string;
};

export const empty: Me = {
  name: "",
  telegram: "",
  github: "",
  email: "",
  dolls: "",
  avatar: "/images/web/avatar.jpg",
  timezone: "UTC",
};

export function from(d: Partial<Me> | null): Me {
  if (!d) return empty;
  return {
    name: d.name || "",
    telegram: d.telegram || "",
    github: d.github || "",
    email: d.email || "",
    dolls: d.dolls || "",
    avatar: d.avatar || empty.avatar,
    timezone: d.timezone || empty.timezone,
  };
}

export function hrefs(me: Me) {
  return {
    github: me.github ? `https://github.com/${me.github}` : "",
    telegram: me.telegram ? `https://t.me/${me.telegram}` : "",
    email: me.email ? `mailto:${me.email}` : "",
  };
}

export function Avatar({ src, name }: { src: string; name: string }) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <Tile className="h-14 w-14">
        <Telegram className="h-5 w-5" />
      </Tile>
    );
  }

  return (
    <img
      src={src}
      alt={name ? `${name}'s avatar` : "Contact avatar"}
      onError={() => setBroken(true)}
      className="h-14 w-14 shrink-0 rounded-[8px] border border-[var(--white)]/[0.1] object-cover"
    />
  );
}
