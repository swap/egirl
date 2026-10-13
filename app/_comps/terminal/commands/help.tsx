import { entries, get, type Helpers } from "@/app/_comps/lib/commands";

const ORDER = ["shell", "network", "encode", "system", "games", "other"];

const LABELS: Record<string, string> = {
  shell: "shell",
  network: "network",
  encode: "encode / secrets",
  system: "system",
  games: "games",
  other: "other",
};

function pad(name: string, w: number) {
  return name + " ".repeat(Math.max(1, w - name.length));
}

function run(args: string[], _helpers: Helpers) {
  const all = entries();
  const q = (args[0] || "").toLowerCase();

  if (q) {
    const hit = all.find((e) => e.name === q);
    if (!hit) {
      const cmd = get(q);
      if (!cmd) return `No manual entry for ${args[0]}`;
      return `${q} — ${cmd.help || "(no description)"}`;
    }
    return `${hit.name} — ${hit.help}\ngroup: ${hit.group}`;
  }

  const width = Math.max(...all.map((e) => e.name.length), 8) + 2;
  const groups = new Map<string, typeof all>();
  for (const e of all) {
    const g = groups.get(e.group) || [];
    g.push(e);
    groups.set(e.group, g);
  }

  const lines = [
    "usage: <command> [<args>]",
    "",
    "These are common commands used in various situations:",
    "",
  ];

  for (const key of [
    ...ORDER.filter((k) => groups.has(k)),
    ...[...groups.keys()].filter((k) => !ORDER.includes(k)).sort(),
  ]) {
    const items = groups.get(key)!;
    lines.push(`${LABELS[key] || key}`);
    for (const e of items) {
      lines.push(`   ${pad(e.name, width)}${e.help}`);
    }
    lines.push("");
  }

  lines.push("'help <command>' for more on a command.");
  return lines.join("\n").trimEnd();
}

const help = "Show this help, or help <cmd>";
const group = "shell";

export { run, help, group };
