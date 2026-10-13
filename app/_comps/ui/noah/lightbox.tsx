import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { useCopy } from "@/app/_comps/lib/copy";
import { Check, Copy, Open } from "@/app/_comps/ui/icons";
import { abs, chip, save, type Img } from "@/app/_comps/ui/noah/shared";

export function Lightbox({ img, onClose }: { img: Img; onClose: () => void }) {
  const { copied, copy } = useCopy();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={img.name || "photo"}
      className="fixed inset-0 z-50 flex flex-col bg-[#171717f0] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-end gap-1.5 px-4 pt-4 sm:px-6 sm:pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label={copied ? "copied" : "copy link"}
          onClick={() => copy(abs(img.url))}
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
          onClick={() => void save(img)}
          className={chip}
        >
          <Download className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="open in new tab"
          onClick={() =>
            window.open(abs(img.url), "_blank", "noopener,noreferrer")
          }
          className={chip}
        >
          <Open className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="close"
          onClick={onClose}
          className={chip}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-4 pt-3 sm:p-8 sm:pt-4">
        <img
          src={img.url}
          alt={img.name}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-[10px] border border-[var(--white)]/[0.1] object-contain shadow-[0_40px_80px_-40px_#000]"
        />
      </div>
    </div>
  );
}
