export type Img = {
  name: string;
  url: string;
};

export type Status = "load" | "ready" | "empty" | "error";

export type Pack = {
  images: Img[];
  edit: boolean;
};

export function abs(url: string) {
  if (typeof location === "undefined") return url;
  return new URL(url, location.origin).href;
}

export function key_of(img: Img) {
  return `noah/${img.name}`;
}

export async function save(img: Img) {
  try {
    const r = await fetch(img.url);
    const blob = await r.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = img.name || "noah.jpg";
    a.click();
    URL.revokeObjectURL(href);
  } catch {
    const a = document.createElement("a");
    a.href = img.url;
    a.download = img.name || "noah.jpg";
    a.click();
  }
}

export function link() {
  return "cursor-pointer text-[var(--white)]/35 transition-colors hover:text-[var(--white)]/70 disabled:pointer-events-none disabled:opacity-40";
}

export function lanes(items: Img[], n: number) {
  const out = Array.from({ length: n }, () => [] as { img: Img; i: number }[]);
  items.forEach((img, i) => out[i % n].push({ img, i }));
  return out;
}

export function as_imgs(d: unknown): Img[] {
  if (!Array.isArray(d)) return [];
  return d.filter(
    (x): x is Img =>
      !!x &&
      typeof x === "object" &&
      typeof (x as Img).url === "string" &&
      typeof (x as Img).name === "string",
  );
}

export const chip =
  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-[var(--white)]/15 bg-[var(--black)] text-[var(--white)] shadow-[0_10px_24px_-12px_#000] outline-none transition-[background-color,border-color,box-shadow,transform] duration-150 hover:scale-105 hover:border-[var(--white)]/70 hover:bg-[#2a2a2a] hover:shadow-[0_0_0_1px_#f7f7f755,0_10px_24px_-12px_#000] focus-visible:border-[var(--white)]/80 focus-visible:shadow-[0_0_0_1px_#f7f7f766] active:scale-95";
