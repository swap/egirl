import { useEffect, useState } from "react";
import { Page } from "@/app/_comps/layout";
import { icon_bugs } from "@/app/_comps/ui/small-widget";
import { Group, type Skills } from "@/app/_comps/ui/skills/shared";

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skills | null>(null);
  const bugs = icon_bugs();

  useEffect(() => {
    void fetch("/api/v2/info")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSkills(d?.skills || null));
  }, []);

  return (
    <Page>
      <section className="font-satoshi relative flex min-h-[100svh] items-center px-5 pt-16 pb-28 text-[var(--white)] sm:px-8 lg:py-16 lg:pr-10 lg:pl-28">
        <div className="mx-auto w-full max-w-[44rem]">
          <header className="rise mb-10">
            <p className="text-[11px] text-[var(--white)]/35"># craft</p>
            <h1 className="mt-1 text-[clamp(1.8rem,5vw,2.25rem)] leading-none font-semibold tracking-[-0.03em]">
              skills
            </h1>
            <p className="mt-3 max-w-[32rem] text-[14px] leading-6 text-[var(--white)]/50 sm:text-[15px]">
              Some of the daily technologies I work with.
            </p>
          </header>

          {bugs.length ? (
            <div className="mb-8 rounded-[8px] border border-[var(--white)]/[0.1] px-3 py-2 text-[12px] text-[var(--white)]/55">
              {bugs.map((b) => (
                <p key={b}>{b}</p>
              ))}
            </div>
          ) : null}

          {!skills ? (
            <p className="text-[13px] text-[var(--white)]/40">loading…</p>
          ) : (
            <div className="rise space-y-10" style={{ animationDelay: "60ms" }}>
              <Group
                label="languages"
                note="core languages i reach for first"
                items={skills.languages}
              />
              <Group
                label="frameworks & libraries"
                note="ui, apis, and ml stacks i ship with"
                items={skills["frameworks & libraries"]}
              />
              <Group
                label="tools & platforms"
                note="runtime, data, and deploy tooling"
                items={skills.tools}
              />
            </div>
          )}
        </div>
      </section>
    </Page>
  );
}

