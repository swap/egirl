import type { ReactNode } from "react";

type Helpers = {
  done: () => void;
};

type Cmd = {
  run: (
    args: string[],
    helpers: Helpers,
  ) => ReactNode | string | void | Promise<ReactNode | string | void>;
  help?: string;
  group?: string;
};

type Entry = {
  name: string;
  help: string;
  group: string;
};

const files = import.meta.glob("../terminal/**/*.{ts,tsx}", {
  eager: true,
}) as Record<string, Cmd>;

const cmds: Record<string, Cmd> = {};
const bugs: string[] = [];

for (const [path, mod] of Object.entries(files)) {
  if (typeof mod?.run !== "function") {
    bugs.push(`no run() in ${path}`);
    continue;
  }
  const name = path
    .split(/[/\\]/)
    .pop()!
    .replace(/\.(tsx|ts)$/i, "")
    .toLowerCase();
  if (cmds[name]) {
    bugs.push(`duplicate ${name} → ${path}`);
    continue;
  }
  cmds[name] = mod;
}

const builtins: Entry[] = [
  { name: "help", help: "Show this help, or help <cmd>", group: "shell" },
  { name: "clear", help: "Clear the terminal screen", group: "shell" },
  { name: "clean", help: "Restart the terminal fresh", group: "shell" },
  { name: "exit", help: "Close the terminal", group: "shell" },
  { name: "quit", help: "Close the terminal", group: "shell" },
];

function list() {
  return [...builtins.map((b) => b.name), ...Object.keys(cmds)]
    .filter((n, i, a) => a.indexOf(n) === i)
    .sort();
}

function get(name: string) {
  return cmds[name.toLowerCase()] || null;
}

function entries(): Entry[] {
  const from_cmds: Entry[] = Object.entries(cmds).map(([name, mod]) => ({
    name,
    help: mod.help || "(no description)",
    group: mod.group || "other",
  }));
  const names = new Set(from_cmds.map((e) => e.name));
  return [...builtins.filter((b) => !names.has(b.name)), ...from_cmds].sort(
    (a, b) => a.name.localeCompare(b.name),
  );
}

export { list, get, bugs, entries };
export type { Helpers, Cmd, Entry };
