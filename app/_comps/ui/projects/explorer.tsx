import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Folder as FolderIcon,
  HandCoins,
  Link,
  Sparkles,
  Users,
} from "lucide-react";
import SpecularButton from "@/app/_comps/ui/button";
import { Github } from "@/app/_comps/ui/icons";
import {
  type Data,
  type Item,
  type Kind,
  type Person,
  gh,
  is_old,
  person_avatar,
  person_href,
  repo_of,
  site_of,
  SoftLogo,
  when_of,
  year,
} from "@/app/_comps/ui/projects/shared";

export const folders: {
  kind: Kind;
  label: string;
  icon: typeof FolderIcon;
}[] = [
  { kind: "projects", label: "projects", icon: FolderIcon },
  { kind: "smaller", label: "smaller", icon: Sparkles },
  { kind: "older", label: "older", icon: Clock },
  { kind: "collabs", label: "collabs", icon: Users },
];

export function Explorer({ data }: { data: Data }) {
  const [tab, setTab] = useState<Kind>("projects");
  const [pick, setPick] = useState(0);
  const [live, setLive] = useState(false);
  const pickRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pickBox, setPickBox] = useState<{ y: number; h: number } | null>(null);

  const buckets = useMemo(() => {
    const projects: Item[] = [];
    const smaller: Item[] = [];
    const collabs: Item[] = [];
    const older: Item[] = [];

    for (const item of data.projects || []) {
      if (is_old(item)) older.push(item);
      else projects.push(item);
    }
    for (const item of data.small || []) {
      if (is_old(item)) older.push(item);
      else smaller.push(item);
    }
    for (const item of data.contributions || []) {
      if (is_old(item)) older.push(item);
      else collabs.push(item);
    }
    for (const item of data.older || []) {
      older.push(item);
    }

    return { projects, smaller, older, collabs };
  }, [data]);

  const counts = {
    projects: buckets.projects.length,
    smaller: buckets.smaller.length,
    older: buckets.older.length,
    collabs: buckets.collabs.length,
  };

  const items = buckets[tab];
  const total = counts.projects + counts.smaller + counts.older + counts.collabs;

  useEffect(() => {
    setPick(0);
  }, [tab]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const el = pickRefs.current[pick];
    if (!el) {
      setPickBox(null);
      return;
    }
    const sync = () => setPickBox({ y: el.offsetTop, h: el.offsetHeight });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pick, tab, items.length]);

  const item = items[Math.min(pick, Math.max(items.length - 1, 0))];
  const site = item ? site_of(item) : "";
  const github = item ? gh(item.github) : "";
  const support = item?.support || "";
  const when = item ? year(item.date) : "";
  const when_full = item ? when_of(item.date) : "";
  const repo = item ? repo_of(item.github) : "";
  const href = site || github || undefined;
  const folder = folders.find((f) => f.kind === tab);
  const version = item?.version?.trim() || "";

  const meta = [
    version ? { k: "version", v: version } : null,
    { k: "folder", v: folder?.label || "" },
    when_full ? { k: "created", v: when_full } : null,
    repo ? { k: "repo", v: repo } : null,
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div
      className="rise overflow-hidden rounded-[6px] border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.025] shadow-[inset_0_1px_0_#f7f7f708,0_24px_50px_-36px_#171717cc] backdrop-blur-2xl backdrop-saturate-150"
      style={{ animationDelay: "40ms" }}
    >
      <div className="grid lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="flex max-h-[20rem] flex-col border-b border-[var(--white)]/[0.06] bg-[var(--white)]/[0.015] lg:max-h-none lg:border-r lg:border-b-0">
          <div className="border-b border-[var(--white)]/[0.06] px-3 pt-3.5 pb-2.5">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-semibold tracking-[-0.02em]">projects</p>
              <span className="text-[10px] tabular-nums text-[var(--white)]/35">{total}</span>
            </div>
            <p className="mt-0.5 text-[10px] text-[var(--white)]/28">pick a folder</p>
          </div>

          <div className="border-b border-[var(--white)]/[0.06] p-1.5">
            <nav className="flex flex-col gap-px" aria-label="project folders">
              {folders.map((f) => {
                const on = f.kind === tab;
                const Icon = f.icon;
                return (
                  <button
                    key={f.kind}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTab(f.kind)}
                    className={`relative flex w-full items-center gap-2 overflow-hidden rounded-[5px] px-2 py-1.5 text-left text-[12px] font-medium tracking-[-0.01em] outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50 ${
                      on
                        ? "bg-[var(--white)]/[0.06] text-[var(--white)]"
                        : "text-[var(--white)]/40 hover:bg-[var(--white)]/[0.03] hover:text-[var(--white)]/72"
                    }`}
                  >
                    {on ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-1 left-0 w-px bg-[var(--white)]/70"
                      />
                    ) : null}
                    <Icon
                      strokeWidth={1.8}
                      className={`h-3 w-3 shrink-0 ${on ? "opacity-75" : "opacity-35"}`}
                    />
                    <span className="flex-1 truncate">{f.label}</span>
                    <span
                      className={`text-[9px] tabular-nums ${
                        on ? "text-[var(--white)]/40" : "text-[var(--white)]/22"
                      }`}
                    >
                      {counts[f.kind]}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            <p className="px-2 pt-1 pb-1 text-[9px] font-medium tracking-[0.12em] text-[var(--white)]/24 uppercase">
              {folder?.label}
            </p>
            {!items.length ? (
              <p className="px-2 py-5 text-[11px] text-[var(--white)]/32">empty</p>
            ) : (
              <ul className="relative space-y-px">
                {pickBox ? (
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-x-0 z-0 overflow-hidden rounded-[5px] bg-[var(--white)]/[0.055] ${
                      live
                        ? "transition-[transform,height] duration-[280ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
                        : ""
                    }`}
                    style={{ height: pickBox.h, transform: `translateY(${pickBox.y}px)` }}
                  >
                    <span className="absolute inset-y-1 left-0 w-px bg-[var(--white)]/70" />
                  </span>
                ) : null}

                {items.map((it, i) => {
                  const on = i === pick;
                  return (
                    <li key={`${it.name}-${site_of(it) || it.github || ""}`}>
                      <button
                        ref={(el) => {
                          pickRefs.current[i] = el;
                        }}
                        type="button"
                        onClick={() => setPick(i)}
                        aria-pressed={on}
                        className={`relative z-[1] flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50 ${
                          on
                            ? "text-[var(--white)]"
                            : "text-[var(--white)]/42 hover:text-[var(--white)]/78"
                        }`}
                      >
                        <SoftLogo src={it.logo} name={it.name} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-[12px] font-medium tracking-[-0.01em]">
                          {it.name}
                        </span>
                        {year(it.date) ? (
                          <span className="shrink-0 text-[9px] tabular-nums text-[var(--white)]/25">
                            {year(it.date)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <div className="relative min-w-0">
          {!item ? (
            <div className="flex min-h-[14rem] items-center justify-center px-6 py-14">
              <p className="text-[13px] text-[var(--white)]/35">pick a project from the side</p>
            </div>
          ) : (
            <div key={`${tab}-${item.name}`} className="swap flex flex-col gap-5 p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3 sm:gap-4">
                <SoftLogo src={item.logo} name={item.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <h3 className="text-[20px] font-semibold tracking-[-0.03em] sm:text-[22px]">
                      {item.name}
                    </h3>
                    {when ? (
                      <span className="text-[12px] tabular-nums text-[var(--white)]/35">{when}</span>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="mt-2 max-w-[36rem] text-[13px] leading-6 text-[var(--white)]/48 sm:text-[14px]">
                      {item.description}
                    </p>
                  ) : null}
                  {item.tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-[4px] border border-[var(--white)]/[0.07] bg-[var(--white)]/[0.03] px-2 py-0.5 text-[10px] font-medium text-[var(--white)]/42"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {item.with?.length ? (
                    <div className="mt-3.5">
                      <p className="text-[9px] font-medium tracking-[0.12em] text-[var(--white)]/24 uppercase">
                        with
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {item.with.map((p) => {
                          const link = person_href(p);
                          const avatar = person_avatar(p);
                          const inner = (
                            <>
                              {avatar ? (
                                <img
                                  src={avatar}
                                  alt=""
                                  draggable={false}
                                  className="h-6 w-6 object-cover"
                                />
                              ) : (
                                <span className="flex h-6 w-6 items-center justify-center text-[10px] font-semibold text-[var(--white)]/40">
                                  {p.name.trim().slice(0, 1).toLowerCase()}
                                </span>
                              )}
                              <span className="min-w-0">
                                <span className="block text-[12.5px] font-medium tracking-[-0.01em]">
                                  {p.name}
                                </span>
                                {p.login ? (
                                  <span className="block text-[10px] text-[var(--white)]/35">
                                    @{p.login}
                                  </span>
                                ) : null}
                              </span>
                            </>
                          );
                          return (
                            <li key={`${p.name}-${p.github}`}>
                              {link ? (
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.03] px-2 py-1.5 text-[var(--white)]/75 transition-colors hover:border-[var(--white)]/[0.14] hover:bg-[var(--white)]/[0.055] hover:text-[var(--white)]"
                                >
                                  {inner}
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-2 border border-[var(--white)]/[0.06] bg-[var(--white)]/[0.02] px-2 py-1.5 text-[var(--white)]/55">
                                  {inner}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
                  {site ? (
                    <SpecularButton
                      size="sm"
                      radius={6}
                      href={site}
                      target="_blank"
                      autoAnimate={false}
                      followMouse
                      proximity={140}
                      intensity={1.15}
                      shineSize={12}
                      tintOpacity={0.05}
                      className="!px-4 !py-2.5 text-[13px] font-medium tracking-[-0.01em] active:scale-100 [&_svg]:h-3.5 [&_svg]:w-3.5"
                    >
                      <Link strokeWidth={2.25} />
                      <span>check it out</span>
                    </SpecularButton>
                  ) : null}
                  {github ? (
                    <SpecularButton
                      size="sm"
                      radius={6}
                      href={github}
                      target="_blank"
                      autoAnimate={false}
                      followMouse
                      proximity={140}
                      intensity={1.15}
                      shineSize={12}
                      tintOpacity={0.05}
                      className="!px-2.5 !py-2.5 active:scale-100 [&_svg]:h-3.5 [&_svg]:w-3.5"
                    >
                      <Github />
                    </SpecularButton>
                  ) : null}
                  {support ? (
                    <SpecularButton
                      size="sm"
                      radius={6}
                      href={support}
                      target="_blank"
                      autoAnimate={false}
                      followMouse
                      proximity={140}
                      intensity={1.15}
                      shineSize={12}
                      tintOpacity={0.05}
                      className="!px-2.5 !py-2.5 active:scale-100 [&_svg]:h-3.5 [&_svg]:w-3.5"
                    >
                      <HandCoins strokeWidth={2.25} />
                    </SpecularButton>
                  ) : null}
                </div>
              </div>

              {item.banner ? (
                href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="block w-full overflow-hidden rounded-[6px]">
                    <img
                      src={item.banner}
                      alt=""
                      draggable={false}
                      className="block h-auto w-full object-cover object-top"
                    />
                  </a>
                ) : (
                  <img
                    src={item.banner}
                    alt=""
                    draggable={false}
                    className="block h-auto w-full rounded-[6px] object-cover object-top"
                  />
                )
              ) : null}
            </div>
          )}
        </div>
      </div>

      {item && meta.length ? (
        <div className="flex flex-wrap items-center gap-x-0 gap-y-2 border-t border-[var(--white)]/[0.06] bg-[var(--white)]/[0.02] px-4 py-2.5 sm:px-5">
          {meta.map((m, i) => (
            <div key={m.k} className="flex min-w-0 items-center">
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className="mx-3.5 hidden h-3 w-px shrink-0 bg-[var(--white)]/[0.1] sm:block"
                />
              ) : null}
              <p className="min-w-0 truncate text-[11px]">
                <span className="text-[var(--white)]/28">{m.k} </span>
                <span className="font-medium tracking-[-0.01em] text-[var(--white)]/70">{m.v}</span>
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
