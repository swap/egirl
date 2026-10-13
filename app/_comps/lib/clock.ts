import { useEffect, useState } from "react";

const opts: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

function fmt(d: Date, tz?: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: tz }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-GB", opts).format(d);
  }
}

function useClock(tz?: string) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  return {
    yours: now ? fmt(now) : "--:--",
    mine: now ? fmt(now, tz || undefined) : "--:--",
  };
}

export { useClock };
