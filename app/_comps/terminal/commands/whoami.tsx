async function run(_args: string[]) {
  const res = await fetch("/api/v2/me", { cache: "no-store" });
  const data = (await res.json()) as {
    name?: string;
    description?: string;
    telegram?: string;
    discord?: string;
    email?: string;
    host?: string;
    error?: string;
  };
  if (!res.ok) return data.error || "whoami failed";

  const lines = [
    data.name || "tess",
    data.host ? `host  ${data.host}` : "",
    data.email ? `mail  ${data.email}` : "",
    data.telegram ? `tg    ${data.telegram}` : "",
    data.discord ? `dc    ${data.discord}` : "",
    data.description || "",
  ].filter(Boolean);

  return lines.join("\n");
}

const help = "Print identity and contact info";
const group = "system";

export { run, help, group };
