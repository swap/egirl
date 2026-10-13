import { useEffect, useRef, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useCopy } from "@/app/_comps/lib/copy";
import { Check, Copy, Open } from "@/app/_comps/ui/icons";
import { abs, chip, key_of, save, type Img } from "@/app/_comps/ui/noah/shared";

export function Shot({
  img,
  delay,
  edit,
  onOpen,
  onDelete,
}: {
  img: Img;
  delay: number;
  edit: boolean;
  onOpen: () => void;
  onDelete: (img: Img) => void;
}) {
  const [on, setOn] = useState(false);
  const { copied, copy } = useCopy();

  return (
    <div
      className="rise group relative overflow-hidden rounded-2xl border border-[var(--white)]/[0.1] bg-[var(--white)]/[0.03] shadow-[0_1px_0_#f7f7f70a_inset,0_10px_30px_-12px_#000000cc] outline-none transition-[box-shadow,border-color] duration-300 ease-out hover:border-[var(--white)]/[0.22] hover:shadow-[0_1px_0_#f7f7f714_inset,0_0_0_1px_#f7f7f71a,0_0_32px_#000000bb,0_22px_50px_-14px_#000000] focus-within:border-[var(--white)]/[0.22] focus-within:shadow-[0_1px_0_#f7f7f714_inset,0_0_0_1px_#f7f7f71a,0_0_32px_#000000bb,0_22px_50px_-14px_#000000]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={img.name || "open photo"}
        className="relative block w-full cursor-pointer text-left outline-none"
      >
        <img
          src={img.url}
          alt={img.name}
          loading="lazy"
          draggable={false}
          onLoad={() => setOn(true)}
          className={`fade block h-auto w-full ${on ? "on" : ""}`}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_#f7f7f714,inset_0_0_40px_#00000080,inset_0_-30px_50px_-20px_#000000a6] transition-[box-shadow] duration-300 group-hover:shadow-[inset_0_0_0_1px_#f7f7f71f,inset_0_0_60px_#000000a6,inset_0_-30px_50px_-20px_#000000cc]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,#f7f7f71f_0%,transparent_38%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[var(--white)]/0 transition-colors duration-300 group-hover:bg-[var(--white)]/[0.06]"
        />
      </button>

      {edit ? (
        <div className="absolute top-2 left-2 z-[1] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            aria-label="delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(img);
            }}
            className={chip}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      ) : null}

      <div className="absolute top-2 right-2 z-[1] flex gap-1.5 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          aria-label={copied ? "copied" : "copy link"}
          onClick={(e) => {
            e.stopPropagation();
            copy(abs(img.url));
          }}
          className={chip}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          aria-label="download"
          onClick={(e) => {
            e.stopPropagation();
            void save(img);
          }}
          className={chip}
        >
          <Download className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
