import { useEffect, useState } from "react";
import { Page } from "@/app/_comps/layout";
import type { Stats } from "@/app/_comps/lib/music";
import { Seg } from "@/app/_comps/ui/seg";
import { Albums } from "@/app/_comps/ui/music/albums";
import { Favourites } from "@/app/_comps/ui/music/favourites";
import { Empty } from "@/app/_comps/ui/music/shared";
import { Overview } from "@/app/_comps/ui/music/stats";
import { Ranked } from "@/app/_comps/ui/music/tracks";

const tabs = ["Albums", "Tracks", "Favourite", "Stats"];

export default function MusicPage() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void fetch("/api/v2/music/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Stats) => setData(d))
      .catch(() => setFailed(true));
  }, []);

  return (
    <Page>
      <div className="font-satoshi relative flex min-h-screen items-center bg-[radial-gradient(900px_500px_at_15%_-5%,#f7f7f70c,transparent_65%)] px-6 py-28 text-[var(--white)] md:px-24 md:py-24">
        <div className="mx-auto w-full max-w-[1120px]">
          <header className="rise">
            <div>
              <p className="text-[14px] text-[var(--white)]/45"># my taste</p>
              <h1 className="mt-1 text-[42px] leading-none font-black tracking-tight">music</h1>
              <p className="mt-3 text-[16px] text-[var(--white)]/55">
                what i've been listening to
              </p>
            </div>
            <Seg
              fill
              items={tabs}
              value={tab}
              onChange={setTab}
              className="mt-8"
            />
          </header>

          <div className="mt-10">
            {failed ? (
              <Empty text="couldn't reach last.fm" />
            ) : !data ? (
              <p className="rise text-[14px] text-[var(--white)]/40">loading…</p>
            ) : tab === 0 ? (
              <Albums key="albums" items={data.albums} />
            ) : tab === 1 ? (
              <Ranked key="tracks" items={data.tracks} hero />
            ) : tab === 2 ? (
              <Favourites key="loved" items={data.loved} />
            ) : (
              <Overview data={data} />
            )}
          </div>
        </div>

        <div
          aria-hidden="true"
          className="grain pointer-events-none fixed inset-0 z-10 opacity-[0.07]"
        />
      </div>
    </Page>
  );
}
