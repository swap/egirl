import { useEffect, useState, type ReactNode } from "react";
import { BriefcaseBusiness, Handshake } from "lucide-react";
import { Page } from "@/app/_comps/layout";
import { CommissionsModal } from "@/app/_comps/ui/commissions";
import { Discord, Github, Telegram } from "@/app/_comps/ui/icons";
import { NowPlaying } from "@/app/_comps/ui/player";
import { SponsorBadge } from "@/app/_comps/ui/sponsor";
import { Action } from "@/app/_comps/ui/home/action";
import { Bio } from "@/app/_comps/ui/home/bio";
import { Games } from "@/app/_comps/ui/home/games";
import { Subject } from "@/app/_comps/ui/home/subject";
import type { Me, Section } from "@/app/_comps/ui/home/types";

export default function IndexPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(-1);

  useEffect(() => {
    void fetch("/api/v2/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Me | null) => {
        setMe(d);
        setSection(-1);
      });
  }, []);

  const name = me?.name || "…";
  const links = me?.links || {};
  const greeting = me?.greeting || "hey there";
  const sections = me?.sections || [];
  const active = section >= 0 ? sections[section] : null;
  const games = active?.games || [];
  const description =
    games.length > 0 ? "" : active?.description || me?.description || "";
  const panelKey = active?.id || "home";
  const tab =
    "font-medium outline-none transition-[color,opacity,font-size,letter-spacing] duration-300 ease-out";
  const tabOn = "text-[22px] leading-8 tracking-[-0.02em] text-[var(--white)]/75 sm:text-[26px] sm:leading-9";
  const tabOff =
    "text-[13px] leading-8 tracking-normal text-[var(--white)]/28 hover:text-[var(--white)]/55 sm:text-[14px] sm:leading-9";

  const panel =
    games.length > 0 ? (
      <Games items={games} />
    ) : description ? (
      <p className="max-w-[48rem] text-[15px] leading-7 text-[var(--white)]/50 sm:text-[16px] sm:leading-8">
        <Bio text={description} links={links} />
      </p>
    ) : null;

  const actions = [
    ...[
      { key: "github", href: links.github, icon: <Github />, label: "github" },
      {
        key: "telegram",
        href: links.telegram,
        icon: <Telegram />,
        label: "telegram",
      },
      {
        key: "discord",
        href: links.discord,
        icon: <Discord />,
        label: "discord",
      },
    ].filter((s) => s.href),
    ...(links.projects
      ? [
          {
            key: "projects",
            href: links.projects,
            icon: <BriefcaseBusiness />,
            label: "projects",
          },
        ]
      : []),
  ];

  const showCommission = me?.commissions?.enabled !== false;

  return (
    <Page>
      <section className="font-satoshi relative flex min-h-[100svh] items-center justify-center px-5 pt-16 pb-28 text-[var(--white)] sm:px-8 lg:py-16 lg:pr-16 lg:pl-40">
        <div className="mx-auto w-full max-w-[56rem]">
          <header className="rise mb-6">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="text-[12px] text-[var(--white)]/35"># home</p>
                <h1 className="mt-2 text-[clamp(2.75rem,8vw,4.5rem)] leading-[0.92] font-semibold tracking-[-0.045em]">
                  {name}
                </h1>
              </div>
              <NowPlaying />
            </div>
            <div className="mt-4 flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
              <button
                type="button"
                onClick={() => setSection(-1)}
                aria-current={section < 0 ? "true" : undefined}
                className={`${tab} text-left ${section < 0 ? tabOn : tabOff}`}
              >
                {greeting}
              </button>
              {sections.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(i)}
                  aria-current={i === section ? "true" : undefined}
                  className={`${tab} ${i === section ? tabOn : tabOff}`}
                >
                  <span
                    className={`transition-opacity duration-300 ${
                      i === section ? "opacity-40" : "opacity-25"
                    }`}
                  >
                    /
                  </span>{" "}
                  {s.label}
                </button>
              ))}
            </div>
            {panel ? <Subject id={panelKey}>{panel}</Subject> : null}
          </header>

          {!me ? (
            <p className="text-[14px] text-[var(--white)]/40">loading…</p>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {actions.map((s, i) => (
                  <Action
                    key={s.key}
                    icon={s.icon}
                    label={s.label}
                    href={s.href as string}
                    delay={140 + i * 45}
                  />
                ))}
                {showCommission ? (
                  <Action
                    icon={<Handshake />}
                    label="commission"
                    delay={140 + actions.length * 45}
                    onClick={() => setOpen(true)}
                  />
                ) : null}
                <div
                  className="rise"
                  style={{
                    animationDelay: `${140 + (actions.length + (showCommission ? 1 : 0)) * 45}ms`,
                  }}
                >
                  <SponsorBadge />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <CommissionsModal open={open} onClose={() => setOpen(false)} />
    </Page>
  );
}

