import { useEffect, useState } from "react";
import { Handshake } from "lucide-react";
import { Page } from "@/app/_comps/layout";
import SpecularButton from "@/app/_comps/ui/button";
import { CommissionsModal } from "@/app/_comps/ui/commissions";
import { Explorer } from "@/app/_comps/ui/projects/explorer";
import type { Data } from "@/app/_comps/ui/projects/shared";

export default function ProjectsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void fetch("/api/v2/projects")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d || { projects: [], small: [], contributions: [], older: [] }))
      .catch(() => setData({ projects: [], small: [], contributions: [], older: [] }));
  }, []);

  return (
    <Page>
      <section className="font-satoshi relative flex min-h-[100svh] items-center px-5 pt-16 pb-28 text-[var(--white)] sm:px-8 lg:py-16 lg:pr-10 lg:pl-28">
        <div className="mx-auto w-full max-w-[58rem]">
          <header className="rise mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--white)]/35"># work</p>
              <h1 className="mt-1 text-[clamp(1.8rem,5vw,2.25rem)] leading-none font-semibold tracking-[-0.03em]">
                projects
              </h1>
              <p className="mt-2.5 text-[14px] leading-6 text-[var(--white)]/45 sm:text-[15px]">
                pick a folder, then a project
              </p>
            </div>
            <SpecularButton
              size="sm"
              radius={7}
              onClick={() => setOpen(true)}
              autoAnimate={false}
              followMouse
              proximity={140}
              intensity={1.15}
              shineSize={12}
              tintOpacity={0.05}
              className="!px-3.5 !py-2 text-[13px] font-medium tracking-[-0.01em] active:scale-100 [&_svg]:h-3.5 [&_svg]:w-3.5"
            >
              <span className="flex opacity-80">
                <Handshake />
              </span>
              commission
            </SpecularButton>
          </header>

          {!data ? (
            <p className="text-[13px] text-[var(--white)]/40">loading…</p>
          ) : (
            <Explorer data={data} />
          )}
        </div>
      </section>
      <CommissionsModal open={open} onClose={() => setOpen(false)} />
    </Page>
  );
}
