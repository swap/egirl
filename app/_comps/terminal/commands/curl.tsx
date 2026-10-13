async function run(args: string[]) {
  if (!args[0]) return "usage: curl <url> [-I]";

  const target = args[0];
  const head = args.includes("-I") || args.includes("--head");
  const q = new URLSearchParams({
    url: target,
    method: head ? "HEAD" : "GET",
  });
  const res = await fetch(`/api/v2/terminal/curl?${q}`, { cache: "no-store" });
  const data = (await res.json()) as { output?: string; error?: string };
  if (res.status === 429) return data.error || "rate limited · try again later";
  if (!res.ok && !data.output) return data.error || "curl failed";
  return data.output || data.error || "";
}

const help = "HTTP probe a url (curl <url> [-I])";
const group = "network";

export { run, help, group };
