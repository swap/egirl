function to_hex(text: string) {
  const bytes = new TextEncoder().encode(text);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function from_hex(text: string) {
  const clean = text.replace(/[\s:]/g, "");
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2) {
    throw new Error("bad hex");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

async function run(args: string[]) {
  const op = (args[0] || "").toLowerCase();
  const rest = args.slice(1).join(" ");

  if (op === "encode" || op === "enc" || op === "e") {
    if (!rest) return "usage: hex encode <text>";
    return to_hex(rest);
  }
  if (op === "decode" || op === "dec" || op === "d") {
    if (!rest) return "usage: hex decode <hex>";
    try {
      return from_hex(rest);
    } catch {
      return "hex: invalid input";
    }
  }

  if (!args.length) return "usage: hex encode|decode <text>";
  return to_hex(args.join(" "));
}

const help = "Hex encode/decode text (hex encode|decode <text>)";
const group = "encode";

export { run, help, group };
