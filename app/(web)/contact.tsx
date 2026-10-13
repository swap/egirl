import { useEffect, useState } from "react";
import { Page } from "@/app/_comps/layout";
import { Chip } from "@/app/_comps/ui/glass";
import { Mail, Github, Telegram } from "@/app/_comps/ui/icons";
import { useClock } from "@/app/_comps/lib/clock";
import { Main, Row } from "@/app/_comps/ui/contact/main";
import { empty, from, hrefs, type Me } from "@/app/_comps/ui/contact/shared";

export default function ContactPage() {
  const [me, setMe] = useState<Me>(empty);
  const [ready, setReady] = useState(false);
  const clock = useClock(me.timezone);
  const links = hrefs(me);

  useEffect(() => {
    let live = true;

    void fetch("/api/v2/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live) setMe(from(d));
      })
      .catch(() => {})
      .finally(() => {
        if (live) setReady(true);
      });

    return () => {
      live = false;
    };
  }, []);

  const github = me.github
    ? `@${me.github}`
    : ready
      ? "not listed"
      : "loading…";
  const email = me.email || (ready ? "not listed" : "loading…");

  return (
    <Page>
      <section className="font-satoshi relative flex min-h-[100svh] items-center px-5 pt-16 pb-28 text-[var(--white)] sm:px-8 lg:py-16 lg:pr-10 lg:pl-28">
        <div className="mx-auto w-full max-w-[52rem]">
          <header className="rise">
            <div className="text-[10px] font-medium tracking-[0.18em] text-[var(--white)]/85 uppercase [text-shadow:0_0_18px_#f7f7f755,0_0_40px_#f7f7f722]">
              # get in touch
            </div>

            <div className="mt-3 sm:flex sm:items-end sm:justify-between sm:gap-8">
              <div>
                <h1 className="text-[clamp(2rem,6vw,2.5rem)] leading-none font-semibold tracking-[-0.04em]">
                  contact
                </h1>
                <p className="mt-4 max-w-[34rem] text-[14px] leading-6 text-[var(--white)]/50 sm:text-[15px]">
                  Feel free to reach out about anything. I’ll get back to you as soon as I can.
                </p>
              </div>
            </div>
          </header>

          <div className="mt-7 grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
            <Main me={me} ready={ready} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Row
                delay={120}
                icon={<Github className="h-5 w-5" />}
                channel="github"
                value={github}
                note="projects and contributions"
                href={links.github}
                copyLabel="copy github username"
              />
              <Row
                delay={170}
                icon={<Mail className="h-5 w-5" />}
                channel="email"
                value={email}
                note="for serious talks or deals"
                href={links.email}
                copyLabel="copy email address"
              />
            </div>
          </div>

          <footer
            className="rise mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--white)]/[0.07] pt-4 text-[11px] text-[var(--white)]/35"
            style={{ animationDelay: "220ms" }}
          >
            {me.dolls ? (
              <a
                href={`https://dol.ls/${me.dolls}`}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-[var(--white)]/60"
              >
                checkout my dolls
              </a>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2.5">
              <span>quick time check;</span>
              <span>
                you <Chip>{clock.yours}</Chip>
              </span>
              <span className="text-[var(--white)]/15">/</span>
              <span>
                me <Chip>{clock.mine}</Chip>
              </span>
            </div>
          </footer>
        </div>
      </section>
    </Page>
  );
}

