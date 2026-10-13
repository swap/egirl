type Props = {
  name: string;
  icon?: string;
  link?: string;
};

const files = import.meta.glob("../../../static/images/icons/**/*.svg");

const icons: Record<string, string> = {};
const bugs: string[] = [];
const seen: Record<string, string[]> = {};

function served(path: string) {
  const norm = path.replace(/\\/g, "/");
  const i = norm.lastIndexOf("/images/icons/");
  return i === -1 ? "" : norm.slice(i);
}

for (const path of Object.keys(files)) {
  const base = path
    .split(/[/\\]/)
    .pop()!
    .replace(/\.svg$/i, "")
    .toLowerCase();
  const url = served(path);
  if (!url) continue;
  if (!seen[base]) seen[base] = [];
  seen[base].push(url);
  if (!icons[base]) icons[base] = url;
}

for (const [key, paths] of Object.entries(seen)) {
  if (paths.length > 1) {
    bugs.push(`duplicate ${key}.svg → ${paths.join(" | ")} (using first)`);
  }
}

function icon_bugs() {
  return bugs;
}

function icon_src(icon?: string) {
  if (!icon) return "";
  const raw = icon.trim();
  if (!raw) return "";
  if (raw.startsWith("http") || raw.startsWith("/")) return raw;
  return icons[raw.toLowerCase()] || "";
}

function SmallWidget({ name, icon, link }: Props) {
  const src = icon_src(icon);
  const inner = (
    <>
      {src ? (
        <img
          src={src}
          alt=""
          className="h-5 w-5 shrink-0 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#ddd] text-[10px] uppercase">
          {name.slice(0, 1)}
        </span>
      )}
      <span className="truncate text-[14px]">{name}</span>
    </>
  );

  const className =
    "inline-flex max-w-full items-center gap-2 rounded-xl bg-[#ececec] px-3 py-2 text-[var(--black)] transition hover:bg-[#e2e2e2]";

  if (link) {
    return (
      <a href={link} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return <div className={className}>{inner}</div>;
}

export { SmallWidget, icon_src, icon_bugs };
