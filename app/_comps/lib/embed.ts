import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

const THUMB = "/images/web/test.png";
// matches --bg in globals.css
const ACCENT = 0x171717;

type Info = {
  description?: string;
  github?: string;
  dolls?: string;
};

type Item = {
  url?: string;
  github?: string;
};

function load<T>(file: string): T {
  return parse(readFileSync(join(process.cwd(), "static/data", file), "utf8")) as T;
}

function str(v: unknown) {
  return v == null ? "" : String(v).trim();
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// the org's site lives on its contribution entry in projects.yaml
function snowcats() {
  const data = load<Record<string, Item[] | undefined>>("projects.yaml");
  const items = Object.values(data).flatMap((v) => (Array.isArray(v) ? v : []));
  const hit = items.find(
    (it) => str(it.url) && str(it.github).toLowerCase().startsWith("snowcats/"),
  );
  return str(hit?.url);
}

function links() {
  const info = load<{ "basic-info"?: Info }>("data.yaml")["basic-info"] || {};
  const github = str(info.github);
  const dolls = str(info.dolls);
  return {
    github: github ? `https://github.com/${github}` : "",
    dolls: dolls ? `https://dol.ls/${dolls}` : "",
    snowcats: snowcats(),
  };
}

export function origin(req: Request, url: URL) {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return `${proto || url.protocol.replace(":", "")}://${host || url.host}`;
}

export function embed(site: string) {
  const home = `${site}/`;
  const title = new URL(site).host;
  const l = links();
  const org = l.snowcats ? new URL(l.snowcats).host.replace(/^www\./, "") : "";

  const buttons = [
    { label: "Dolls", url: l.dolls },
    { label: "GitHub", url: l.github },
    { label: "Snowcats", url: l.snowcats },
  ]
    .filter((b) => b.url)
    .map((b) => ({ type: 2, style: 5, label: b.label, url: b.url }));

  const body = [
    {
      type: 9,
      components: [
        { type: 10, content: `# [${title}](${home})` },
        ...(org ? [{ type: 10, content: `-# part of [${org}](${l.snowcats})` }] : []),
      ],
      accessory: { type: 11, media: { url: `${site}${THUMB}` } },
    },
    ...(buttons.length ? [{ type: 1, components: buttons }] : []),
  ];

  const json = JSON.stringify({
    component: { type: 17, accent_color: ACCENT, components: body },
  });
  const desc = org ? `part of ${org}` : title;

  // og tags are the fallback preview when the component embed is rejected
  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(home)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:image" content="${esc(site + THUMB)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="theme-color" content="#${ACCENT.toString(16).padStart(6, "0")}" />`,
    `<script id="discord:component-embed" type="application/json">${json.replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
}
