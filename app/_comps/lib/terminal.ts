import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

let root: Root | null = null;
let host: HTMLDivElement | null = null;
let open = false;
let bound = false;

async function mount() {
  const { Terminal } = await import("@/app/_comps/ui/terminal");
  if (!host) {
    host = document.createElement("div");
    host.id = "egirl-terminal";
    document.body.appendChild(host);
    root = createRoot(host);
  }
  root!.render(createElement(Terminal, { onClose: close }));
  open = true;
}

function close() {
  if (!open || !root) return;
  root.render(null);
  open = false;
}

function show() {
  if (open) return;
  void mount();
}

function toggle() {
  if (open) close();
  else show();
}

function on_key(e: KeyboardEvent) {
  if (!(e.ctrlKey && e.shiftKey)) return;
  if (e.key.toLowerCase() !== "y") return;
  e.preventDefault();
  toggle();
}

function bind() {
  if (typeof window === "undefined" || bound) return;
  bound = true;
  window.addEventListener("keydown", on_key);
}

export { bind, show, close, toggle };
