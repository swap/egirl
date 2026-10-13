function enc(text: string) {
  const bytes = new TextEncoder().encode(text);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function dec(text: string) {
  const clean = text.replace(/\s+/g, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function run(args: string[]) {
  const op = (args[0] || "").toLowerCase();
  const rest = args.slice(1).join(" ");

  if (op === "encode" || op === "enc" || op === "e") {
    if (!rest) return "usage: base64 encode <text>";
    return enc(rest);
  }
  if (op === "decode" || op === "dec" || op === "d") {
    if (!rest) return "usage: base64 decode <text>";
    try {
      return dec(rest);
    } catch {
      return "base64: invalid input";
    }
  }

  if (!args.length) return "usage: base64 encode|decode <text>";
  return enc(args.join(" "));
}

const help = "Base64 encode/decode text (base64 encode|decode <text>)";
const group = "encode";

export { run, help, group };
