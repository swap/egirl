import { useEffect, useState } from "react";
import { Page } from "@/app/_comps/layout";
import { icon_bugs } from "@/app/_comps/ui/small-widget";
import { Pills, Rows, type Info } from "@/app/_comps/ui/envoirment/shared";

export default function EnvoirmentPage() {
  const [info, setInfo] = useState<Info | null>(null);
  const bugs = icon_bugs();

  useEffect(() => {
    void fetch("/api/v2/info")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInfo(d));
  }, []);

  const hardware = Object.entries(info?.hardware || {}).map(([key, item]) => ({
    ...item,
    icon: item.icon || key,
    kind: key,
  }));
  const software = info?.software;
  const os = (
    Array.isArray(software?.os)
      ? software.os
      : software?.os
        ? [software.os]
        : []
  ).map((item) => ({
    ...item,
    icon: item.icon || "os",
    kind: "os",
    info: [item.distro, item.info].filter(Boolean).join(" · ") || undefined,
  }));
  const workstation = [
    ...os,
    ...(software?.editors || []).map((i) => ({ ...i, kind: "editor" })),
    ...(software?.browser || []).map((i) => ({ ...i, kind: "browser" })),
  ];

  return (
    <Page>
      <section className="font-satoshi relative flex min-h-[100svh] items-center px-5 pt-16 pb-28 text-[var(--white)] sm:px-8 lg:py-16 lg:pr-10 lg:pl-28">
        <div className="mx-auto w-full max-w-[44rem]">
          <header className="rise mb-10">
            <p className="text-[11px] text-[var(--white)]/35"># setup</p>
            <h1 className="mt-1 text-[clamp(1.8rem,5vw,2.25rem)] leading-none font-semibold tracking-[-0.03em]">
              envoirment
            </h1>
            <p className="mt-3 max-w-[32rem] text-[14px] leading-6 text-[var(--white)]/50 sm:text-[15px]">
              desk, machine, and the apps i use daily
            </p>
          </header>

          {bugs.length ? (
            <div className="mb-8 rounded-[8px] border border-[var(--white)]/[0.1] px-3 py-2 text-[12px] text-[var(--white)]/55">
              {bugs.map((b) => (
                <p key={b}>{b}</p>
              ))}
            </div>
          ) : null}

          {!info ? (
            <p className="text-[13px] text-[var(--white)]/40">loading…</p>
          ) : (
            <div className="rise space-y-10" style={{ animationDelay: "60ms" }}>
              <Rows
                label="hardware"
                note="the box and peripherals on my desk"
                items={hardware}
              />
              <Rows
                label="workstation"
                note="os, editors, and browsers i bounce between"
                items={workstation}
              />
              <Pills
                label="terminal"
                note="where most of the work actually happens"
                items={software?.terminal}
              />
              <Pills
                label="in my dock"
                note="daily apps always one click away"
                items={software?.["daily apps"]}
              />
              <Pills
                label="tools i reach for"
                note="cli and utilities that stay installed"
                items={software?.tools}
              />
            </div>
          )}
        </div>
      </section>
    </Page>
  );
}

