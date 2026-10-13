import type { APIRoute } from "astro";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

const EXTS = ["svg", "png", "jpg", "jpeg", "gif", "webp", "avif", "ico", "bmp"];

type Person = {
  name: string;
  github: string;
};

type PersonOut = Person & {
  login: string;
  avatar: string;
  url: string;
};

type Item = {
  name: string;
  description?: string;
  support?: string;
  url?: string;
  github?: string;
  site?: string;
  date?: string;
  version?: string;
  logo?: string;
  banner?: string;
  tags?: string[];
  with?: Person[];
};

const gh_cache = new Map<string, PersonOut>();

function slug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function gh_login(v: string) {
  const s = v.trim();
  if (!s) return "";
  try {
    if (s.startsWith("http")) {
      const u = new URL(s);
      const parts = u.pathname.split("/").filter(Boolean);
      return parts[0] || "";
    }
  } catch {
    return "";
  }
  return s.replace(/^@/, "").split("/")[0] || "";
}

async function gh_profile(p: Person): Promise<PersonOut> {
  const login = gh_login(p.github);
  const fallback: PersonOut = {
    name: p.name,
    github: p.github,
    login,
    avatar: login ? `https://github.com/${login}.png?size=96` : "",
    url: login ? `https://github.com/${login}` : "",
  };
  if (!login) return fallback;

  const hit = gh_cache.get(login);
  if (hit) return { ...hit, name: p.name, github: p.github };

  try {
    const res = await fetch(`https://api.github.com/users/${login}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "egirl-v2",
      },
    });
    if (!res.ok) {
      gh_cache.set(login, fallback);
      return fallback;
    }
    const data = (await res.json()) as {
      login?: string;
      avatar_url?: string;
      html_url?: string;
      name?: string | null;
    };
    const out: PersonOut = {
      name: p.name || data.name || data.login || login,
      github: p.github,
      login: data.login || login,
      avatar: data.avatar_url || fallback.avatar,
      url: data.html_url || fallback.url,
    };
    gh_cache.set(login, out);
    return { ...out, name: p.name };
  } catch {
    gh_cache.set(login, fallback);
    return fallback;
  }
}

function media(name: string) {
  const dir = join(process.cwd(), "static/images/projects", slug(name));
  if (!existsSync(dir)) return { logo: "", banner: "" };
  const files = readdirSync(dir);
  const find = (base: string) => {
    for (const ext of EXTS) {
      const hit = files.find((f) => f.toLowerCase() === `${base}.${ext}`);
      if (hit) return `/images/projects/${slug(name)}/${hit}`;
    }
    return "";
  };
  return { logo: find("logo"), banner: find("banner") };
}

function gh_repo(v?: string) {
  if (!v) return "";
  const s = v.trim();
  try {
    if (s.startsWith("http")) {
      const parts = new URL(s).pathname.split("/").filter(Boolean);
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "";
    }
  } catch {
    return "";
  }
  const parts = s.replace(/^@/, "").split("/").filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "";
}

function as_version(msg: string) {
  const line = msg.split("\n")[0]?.trim() || "";
  const hit = line.match(/^v?(\d+\.\d+(?:\.\d+)?)\b/);
  return hit ? hit[1] : "";
}

async function latest_commit(repo: string) {
  if (!repo) return "";
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/commits?per_page=1`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "egirl-v2",
        },
      },
    );
    if (!res.ok) return "";
    const data = (await res.json()) as { commit?: { message?: string } }[];
    return as_version(data?.[0]?.commit?.message || "");
  } catch {
    return "";
  }
}

async function with_media(items: Item[] | undefined) {
  return Promise.all(
    (items || []).map(async (item) => {
      const people = item.with?.length
        ? await Promise.all(item.with.map((p) => gh_profile(p)))
        : undefined;
      const version =
        item.version?.trim() ||
        (await latest_commit(gh_repo(item.github))) ||
        "";
      return { ...item, ...media(item.name), with: people, version };
    }),
  );
}

export const GET: APIRoute = async function projects() {
  try {
    const text = readFileSync(
      join(process.cwd(), "static/data/projects.yaml"),
      "utf8",
    );
    const data = parse(text) as {
      projects?: Item[];
      small?: Item[];
      contributions?: Item[];
      older?: Item[];
    };
    return Response.json({
      projects: await with_media(data.projects),
      small: await with_media(data.small),
      contributions: await with_media(data.contributions),
      older: await with_media(data.older),
    });
  } catch {
    return Response.json({ error: "projects" }, { status: 502 });
  }
};
