import type { Lyric } from "@/app/_comps/lib/music";

export function locate(lyric: Lyric, ms: number) {
  let line = -1;
  for (let i = lyric.lines.length - 1; i >= 0; i--) {
    if (ms >= lyric.lines[i].start) {
      line = i;
      break;
    }
  }
  if (line < 0) return { line: -1, word: -1, fill: 0 };

  const cur = lyric.lines[line];
  const next_line = lyric.lines[line + 1];
  const line_end =
    cur.end > cur.start ? cur.end : next_line?.start || cur.start + 1;

  const words = cur.words;
  if (!words.length) {
    const fill = Math.min(
      1,
      Math.max(0, (ms - cur.start) / Math.max(1, line_end - cur.start)),
    );
    return { line, word: -1, fill };
  }

  let word = -1;
  let fill = 0;
  for (let i = 0; i < words.length; i++) {
    if (!words[i].text.trim() || ms < words[i].start) continue;
    word = i;

    let end = words[i].end;
    for (let j = i + 1; j < words.length; j++) {
      if (!words[j].text.trim()) continue;
      end = words[j].start;
      break;
    }
    if (!(end > words[i].start)) {
      end = line_end > words[i].start ? line_end : words[i].start + 1;
    }

    fill =
      ms >= end
        ? 1
        : Math.min(1, Math.max(0, (ms - words[i].start) / (end - words[i].start)));
  }

  if (word >= 0 && ms >= line_end) fill = 1;
  return { line, word, fill };
}

export function Lyrics({
  lyric,
  line,
  word,
  fill,
}: {
  lyric: Lyric;
  line: number;
  word: number;
  fill: number;
}) {
  const prev = lyric.lines[line - 1];
  const cur = lyric.lines[line];
  const next = lyric.lines[line + 1];

  function paint(pct: number, text: string) {
    return (
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage: `linear-gradient(90deg, var(--white) ${pct}%, color-mix(in srgb, var(--white) 32%, transparent) ${pct}%)`,
          WebkitBackgroundClip: "text",
        }}
      >
        {text}
      </span>
    );
  }

  return (
    <div className="font-satoshi max-w-[46ch] text-right">
      <p
        className={`truncate text-[14px] transition-all duration-300 ease-out ${
          prev ? "text-[var(--white)]/28 blur-[1.5px]" : "text-transparent"
        }`}
      >
        {prev?.text || "\u00a0"}
      </p>
      <p className="mt-1 line-clamp-2 text-[18px] leading-snug font-bold tracking-[-0.01em] whitespace-pre-wrap">
        {!cur ? (
          <span className="text-[var(--white)]/40">…</span>
        ) : cur.words.length ? (
          cur.words.map((w, i) => {
            const done = i < word;
            const on = i === word;
            const pct = done ? 100 : on ? fill * 100 : 0;
            return <span key={i}>{paint(pct, w.text)}</span>;
          })
        ) : (
          paint(fill * 100, cur.text)
        )}
      </p>
      <p
        className={`mt-1 truncate text-[14px] transition-all duration-300 ease-out ${
          next ? "text-[var(--white)]/28 blur-[1.5px]" : "text-transparent"
        }`}
      >
        {next?.text || "\u00a0"}
      </p>
    </div>
  );
}
