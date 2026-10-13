async function run(args: string[]) {
  if (!args[0]) return "usage: nslookup <host>";

  const host = args[0];
  const res = await fetch(
    `/api/v2/terminal/nslookup?host=${encodeURIComponent(host)}`,
    { cache: "no-store" },
  );
  const data = (await res.json()) as { output?: string; error?: string };
  if (res.status === 429) return data.error || "rate limited · try again later";
  if (!res.ok && !data.output) return data.error || "nslookup failed";
  return data.output || data.error || "";
}

const help = "DNS lookup via 1.1.1.1 (nslookup <host>)";
const group = "network";

export { run, help, group };
