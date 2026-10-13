import { useEffect, useRef, useState } from "react";
import { Page } from "@/app/_comps/layout";
import { Lightbox } from "@/app/_comps/ui/noah/lightbox";
import { as_imgs, key_of, link, type Img, type Pack, type Status } from "@/app/_comps/ui/noah/shared";
import { Wall } from "@/app/_comps/ui/noah/wall";

export default function NoahPage() {
  const [images, setImages] = useState<Img[]>([]);
  const [edit, setEdit] = useState(false);
  const [status, setStatus] = useState<Status>("load");
  const [open, setOpen] = useState<Img | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const file = useRef<HTMLInputElement>(null);

  function apply(list: Img[]) {
    setImages(list);
    setStatus(list.length ? "ready" : "empty");
  }

  function load(force = false): Promise<Pack> {
    const q = force ? "?c" : "";
    return fetch(`/api/v2/noah${q}`).then(async (r) => {
      if (!r.ok) throw new Error("bad");
      const d: unknown = await r.json();
      if (Array.isArray(d)) return { images: as_imgs(d), edit: false };
      const row = d as { images?: unknown; edit?: unknown };
      return {
        images: as_imgs(row.images),
        edit: row.edit === true,
      };
    });
  }

  useEffect(() => {
    let live = true;

    void load()
      .then((pack) => {
        if (!live) return;
        setEdit(pack.edit);
        apply(pack.images);
      })
      .catch(() => {
        if (live) setStatus("error");
      });

    return () => {
      live = false;
    };
  }, []);

  function random() {
    if (!images.length) return;
    setOpen(images[Math.floor(Math.random() * images.length)]);
  }

  async function on_add(list: FileList | null) {
    if (!list?.length || busy || !edit) return;
    setBusy(true);
    setNote("");
    try {
      let next: Img[] | null = null;
      for (const f of Array.from(list)) {
        const body = new FormData();
        body.set("file", f);
        const r = await fetch("/api/v2/image/upload", {
          method: "POST",
          body,
        });
        if (r.status === 403) {
          setNote("not allowed");
          setEdit(false);
          return;
        }
        if (!r.ok) throw new Error("upload");
        const d = (await r.json()) as { images?: Img[] };
        if (Array.isArray(d.images)) next = as_imgs(d.images);
      }
      if (!next) next = (await load(true)).images;
      apply(next);
      setNote("");
    } catch {
      setNote("upload failed");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  async function on_delete(img: Img) {
    if (!edit || busy) return;
    if (!window.confirm(`delete ${img.name}?`)) return;
    setBusy(true);
    setNote("");
    try {
      const r = await fetch(
        `/api/v2/image/upload?path=${encodeURIComponent(key_of(img))}`,
        { method: "DELETE" },
      );
      if (r.status === 403) {
        setNote("not allowed");
        setEdit(false);
        return;
      }
      if (!r.ok) throw new Error("delete");
      const d = (await r.json()) as { images?: Img[] };
      const next = Array.isArray(d.images)
        ? as_imgs(d.images)
        : (await load(true)).images;
      if (open?.url === img.url) setOpen(null);
      apply(next);
    } catch {
      setNote("delete failed");
    } finally {
      setBusy(false);
    }
  }

  const show_meta = status === "ready" || status === "empty";

  return (
    <Page>
      <section className="font-satoshi relative min-h-[100svh] px-5 pt-16 pb-28 text-[var(--white)] sm:px-8 lg:py-16 lg:pr-10 lg:pl-28">
        <div className="mx-auto w-full max-w-[64rem]">
          <header className="rise">
            <div className="text-[10px] font-medium tracking-[0.18em] text-[var(--white)]/85 uppercase [text-shadow:0_0_18px_#f7f7f755,0_0_40px_#f7f7f722]">
              # gallery
            </div>
            <div className="mt-3 sm:flex sm:items-end sm:justify-between sm:gap-8">
              <div>
                <h1 className="text-[clamp(2rem,6vw,2.5rem)] leading-none font-semibold tracking-[-0.04em]">
                  noah
                </h1>
                <p className="mt-4 max-w-[34rem] text-[14px] leading-6 text-[var(--white)]/50 sm:text-[15px]">
                  a little gallery for noah. tap a photo to open it.
                </p>
              </div>
              {show_meta ? (
                <p className="mt-4 flex shrink-0 items-center gap-2 text-[12px] sm:mt-0">
                  <span className="text-[var(--white)]/35">
                    {images.length}{" "}
                    {images.length === 1 ? "photo" : "photos"}
                  </span>
                  <span className="text-[var(--white)]/15">·</span>
                  <button
                    type="button"
                    onClick={random}
                    disabled={!images.length}
                    className={link()}
                  >
                    random
                  </button>
                  {edit ? (
                    <>
                      <span className="text-[var(--white)]/15">·</span>
                      <button
                        type="button"
                        onClick={() => file.current?.click()}
                        disabled={busy}
                        className={link()}
                      >
                        {busy ? "adding…" : "add"}
                      </button>
                    </>
                  ) : null}
                  {note ? (
                    <>
                      <span className="text-[var(--white)]/15">·</span>
                      <span className="text-[var(--white)]/35">{note}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          </header>

          <input
            ref={file}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void on_add(e.target.files)}
          />

          <div className="mt-8">
            {status === "load" ? (
              <p className="rise text-[13px] text-[var(--white)]/40">loading…</p>
            ) : null}

            {status === "error" ? (
              <p className="rise text-[13px] text-[var(--white)]/40">
                couldn’t load photos right now
              </p>
            ) : null}

            {status === "empty" ? (
              <p className="rise text-[13px] text-[var(--white)]/40">
                no photos yet
              </p>
            ) : null}

            {status === "ready" ? (
              <>
                <Wall
                  items={images}
                  n={2}
                  edit={edit}
                  className="grid grid-cols-2 items-start gap-3 sm:hidden"
                  onOpen={setOpen}
                  onDelete={(img) => void on_delete(img)}
                />
                <Wall
                  items={images}
                  n={3}
                  edit={edit}
                  className="hidden grid-cols-3 items-start gap-3.5 sm:grid"
                  onOpen={setOpen}
                  onDelete={(img) => void on_delete(img)}
                />
              </>
            ) : null}
          </div>
        </div>
      </section>

      {open ? <Lightbox img={open} onClose={() => setOpen(null)} /> : null}
    </Page>
  );
}

