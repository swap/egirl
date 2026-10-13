import type { APIRoute } from "astro";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { uptime } from "node:process";
import { allow, client_ip, limited } from "@/app/_comps/lib/limit";

type Pkg = {
  dependencies?: Record<string, string>;
  packageManager?: string;
};

type Info = {
  name?: string;
  handle?: string;
  greeting?: string;
  avatar?: string;
  description?: string;
  telegram?: string;
  discord?: string;
  github?: string;
  dolls?: string;
  email?: string;
  timezone?: string;
};

type Commissions = {
  enabled?: boolean;
};

type Section = {
  label?: string;
  description?: string;
  games?: Game[];
};

type Game = {
  name?: string;
  cover?: string;
  tags?: string[] | string;
};

function ver(raw: string | undefined) {
  if (!raw) return "?";
  return raw.replace(/^[\^~>=<\s]+/, "");
}

function runtime(pkg: Pkg) {
  const bun = (globalThis as { Bun?: { version?: string } }).Bun?.version;
  if (bun) return `bun ${bun}`;
  const pm = pkg.packageManager || "";
  const m = pm.match(/^bun@(.+)$/);
  if (m) return `bun ${m[1]}`;
  return "bun";
}

export const GET: APIRoute = function me({ request }) {
  const ip = client_ip(request);
  const gate = allow(ip, "me", 30, 60_000);
  if (!gate.ok) return limited(gate.retry);

  try {
    const text = readFileSync(
      join(process.cwd(), "static/data/data.yaml"),
      "utf8",
    );
    const data = parse(text) as {
      "basic-info"?: Info;
      commissions?: Commissions;
      sections?: Section[];
    };
    const info = data["basic-info"] || {};
    const commissions = data.commissions || {};

    let pkg: Pkg = {};
    try {
      pkg = JSON.parse(
        readFileSync(join(process.cwd(), "package.json"), "utf8"),
      ) as Pkg;
    } catch {}

    const deps = pkg.dependencies || {};
    const tz =
      info.timezone ||
      process.env.TZ ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC";

    const str = (v: unknown) => (v == null ? "" : String(v));

    function cover_url(raw: string) {
      if (!raw) return "";
      if (raw.startsWith("http") || raw.startsWith("/")) return raw;
      return `/images/games/${raw}`;
    }

    function tags_of(raw: string[] | string | undefined) {
      if (Array.isArray(raw)) return raw.map((t) => str(t).trim()).filter(Boolean);
      if (typeof raw === "string" && raw.trim()) {
        return raw.split(",").map((t) => t.trim()).filter(Boolean);
      }
      return [] as string[];
    }

    const sections = (Array.isArray(data.sections) ? data.sections : [])
      .map((s) => {
        const label = str(s.label).trim();
        const games = (Array.isArray(s.games) ? s.games : [])
          .map((g) => ({
            name: str(g.name).trim(),
            cover: cover_url(str(g.cover).trim()),
            tags: tags_of(g.tags),
          }))
          .filter((g) => g.name);
        return {
          label,
          id: label,
          description: str(s.description).trim(),
          games,
        };
      })
      .filter((s) => s.label && (s.description || s.games.length > 0));
    const name = str(info.name) || "tess";
    const github = str(info.github);
    const telegram = str(info.telegram);
    const discord = str(info.discord);
    const email = str(info.email);
    const dolls = str(info.dolls);
    const handle = str(info.handle) || discord || name;

    function discord_link(d: string) {
      if (!d) return "";
      if (d.startsWith("http")) return d;
      if (/^\d{16,20}$/.test(d)) return `https://discord.com/users/${d}`;
      return "";
    }

    function avatar_url(raw: string) {
      if (!raw) return "";
      if (raw.startsWith("http") || raw.startsWith("/")) return raw;
      return `/images/web/${raw}`;
    }

    return Response.json({
      name,
      handle,
      greeting: info.greeting || "hey there",
      avatar: avatar_url(info.avatar || ""),
      description: str(info.description) || "",
      sections,
      telegram,
      discord,
      github,
      dolls,
      email,
      timezone: tz,
      links: {
        projects: "/projects",
        github: github ? `https://github.com/${github}` : "",
        telegram: telegram ? `https://t.me/${telegram}` : "",
        discord: discord_link(discord),
        email: email ? `mailto:${email}` : "",
        dolls: dolls ? `https://dol.ls/${dolls}` : "",
      },
      commissions: {
        enabled: commissions.enabled !== false,
      },
      host: "egirl",
      stack: {
        framework: `astro ${ver(deps.astro)}`,
        lib: `react ${ver(deps.react)}`,
        runtime: runtime(pkg),
        css: `tailwind ${ver(deps.tailwindcss)}`,
        uptime: uptime(),
        date: new Date().toISOString().slice(0, 10),
        tz,
      },
    });
  } catch {
    return Response.json({ error: "me" }, { status: 502 });
  }
};
