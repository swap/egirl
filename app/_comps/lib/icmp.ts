import { spawn } from "node:child_process";
import { platform } from "node:os";

const HOST_RE =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^(?:\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

function ok_host(host: string) {
  if (!host || host.length > 253) return false;
  if (host.includes(" ") || host.includes("/") || host.includes("\\")) return false;
  return HOST_RE.test(host);
}

type Result = {
  ok: boolean;
  output: string;
};

function ping(host: string, count = 4): Promise<Result> {
  if (!ok_host(host)) {
    return Promise.resolve({ ok: false, output: `invalid host: ${host}` });
  }

  const win = platform() === "win32";
  const args = win
    ? ["-n", String(count), host]
    : ["-c", String(count), host];

  return new Promise((resolve) => {
    const child = spawn("ping", args, {
      shell: false,
      windowsHide: true,
    });

    let out = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      out += chunk;
    });
    child.on("error", (err) => {
      resolve({ ok: false, output: err.message });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, output: out.replace(/\r\n/g, "\n").trimEnd() });
    });
  });
}

export { ping, ok_host };
export type { Result };
