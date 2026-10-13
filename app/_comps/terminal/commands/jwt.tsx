function b64url(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function secret(n: number) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

async function run(args: string[]) {
  const n = Math.min(128, Math.max(16, Number(args[0]) || 32));
  if (args[0] && Number.isNaN(Number(args[0]))) {
    return "usage: jwt [bytes]\n  gen a random secret (default 32)";
  }
  return secret(n);
}

const help = "Generate a random JWT secret (jwt [bytes])";
const group = "encode";

export { run, help, group };
