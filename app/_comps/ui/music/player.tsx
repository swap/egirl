import { Pause, Play } from "lucide-react";
import { Disc } from "@/app/_comps/ui/music/disc";
import { Cover } from "@/app/_comps/ui/music/shared";

type Props = {
  image: string;
  playing: boolean;
  loading?: boolean;
  onToggle: () => void;
  label?: string;
};

export function MusicPlayer({ image, playing, loading, onToggle, label }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label || (playing ? "Pause" : "Play")}
      className="group/art pointer-events-auto relative block h-20 w-20 cursor-pointer rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50"
    >
      <Disc out={playing} spin={playing} />
      <div
        className={`relative h-20 w-20 transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
          playing ? "-translate-x-5" : ""
        }`}
      >
        <Cover src={image} className="h-20 w-20 rounded-lg" />
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-lg bg-[#171717]/50 text-[var(--white)] transition-opacity duration-200 ${
            loading
              ? "opacity-100"
              : "opacity-0 group-hover/art:opacity-100 group-focus-visible/art:opacity-100"
          }`}
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--white)]/30 border-t-[var(--white)]" />
          ) : playing ? (
            <Pause className="h-6 w-6 fill-current" strokeWidth={0} />
          ) : (
            <Play className="ml-0.5 h-6 w-6 fill-current" strokeWidth={0} />
          )}
        </div>
      </div>
    </button>
  );
}
