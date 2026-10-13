import type { Links } from "@/app/_comps/ui/home/types";

export function Bio({ text, links }: { text: string; links: Links }) {
  const map: Record<string, string> = {
    projects: links.projects || "",
    telegram: links.telegram || "",
    github: links.github || "",
    discord: links.discord || "",
  };

  function keywords(chunk: string, key: string) {
    return chunk.split(/(\b(?:projects|discord|telegram|github)\b)/gi).map((part, i) => {
      const href = map[part.toLowerCase()];
      if (href) {
        return (
          <a
            key={`${key}-k${i}`}
            href={href}
            className="font-medium text-[var(--white)] transition-opacity hover:opacity-70"
            {...(href.startsWith("http")
              ? { target: "_blank", rel: "noreferrer" }
              : {})}
          >
            {part}
          </a>
        );
      }
      return <span key={`${key}-k${i}`}>{part}</span>;
    });
  }

  const bits = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return (
    <>
      {bits.map((bit, i) => {
        const link = bit.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          return (
            <a
              key={i}
              href={link[2]}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--white)] transition-opacity hover:opacity-70"
            >
              {link[1]}
            </a>
          );
        }
        const bold = bit.match(/^\*\*([^*]+)\*\*$/);
        if (bold) {
          return (
            <strong key={i} className="font-medium text-[var(--white)]">
              {bold[1]}
            </strong>
          );
        }
        return <span key={i}>{keywords(bit, String(i))}</span>;
      })}
    </>
  );
}
