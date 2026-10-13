function fmt(d: Date, tz: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function device_tz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

async function run(_args: string[]) {
  const d = new Date();
  const yours = device_tz();

  let mine = "Europe/Amsterdam";
  try {
    const res = await fetch("/api/v2/me", { cache: "no-store" });
    const data = (await res.json()) as { timezone?: string };
    if (data.timezone) mine = data.timezone;
  } catch {}

  return [
    `device  ${fmt(d, yours)}`,
    `mine    ${fmt(d, mine)}`,
    `yours   ${fmt(d, yours)}`,
  ].join("\n");
}

const help = "Show device, mine, and yours time";
const group = "system";

export { run, help, group };
