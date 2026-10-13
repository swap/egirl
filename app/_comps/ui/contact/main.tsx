import type { ReactNode } from "react";
import { Button, Card, Tile } from "@/app/_comps/ui/glass";
import { Check, Copy, Open } from "@/app/_comps/ui/icons";
import { useCopy } from "@/app/_comps/lib/copy";
import { Avatar, hrefs, type Me } from "@/app/_comps/ui/contact/shared";

export function Main({ me, ready }: { me: Me; ready: boolean }) {
  const { copied, copy } = useCopy();
  const links = hrefs(me);
  const handle = me.telegram
    ? `@${me.telegram}`
    : ready
      ? "not listed"
      : "loading…";

  return (
    <Card
      className="rise flex h-full min-h-[190px] flex-col p-5 sm:p-6"
      style={{ animationDelay: "70ms" }}
    >
      <div className="flex items-center gap-3.5">
        <Avatar src={me.avatar} name={me.name} />
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-medium tracking-[0.16em] text-[var(--white)]/35 uppercase">
            preferred · telegram
          </p>
          <p className="truncate text-[20px] font-semibold tracking-[-0.02em] text-[var(--white)]">
            {handle}
          </p>
        </div>
      </div>

      <p className="mt-5 max-w-[28rem] text-[13px] leading-5 text-[var(--white)]/45">
        fastest way to reach me :)
      </p>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Button
          icon={copied ? <Check /> : <Copy />}
          label={copied ? "username copied" : "copy username"}
          onClick={() => copy(me.telegram)}
          disabled={!me.telegram}
        >
          {copied ? "copied" : "copy username"}
        </Button>
        <Button
          icon={<Open />}
          label="open"
          href={links.telegram}
          disabled={!links.telegram}
        >
          open
        </Button>
      </div>
    </Card>
  );
}

export function Row({
  icon,
  channel,
  value,
  note,
  href,
  delay,
  copyLabel,
}: {
  icon: ReactNode;
  channel: string;
  value: string;
  note: string;
  href: string;
  delay: number;
  copyLabel: string;
}) {
  const { copied, copy } = useCopy();

  return (
    <Card
      className="rise flex min-h-[96px] items-center gap-3 p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Tile>{icon}</Tile>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--white)]/35 uppercase">
          {channel}
        </p>
        <p className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--white)]/90">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--white)]/35">
          {note}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          icon={copied ? <Check /> : <Copy />}
          label={copied ? `${channel} copied` : copyLabel}
          onClick={() => copy(value.replace(/^@/, ""))}
          disabled={!value || value === "not listed" || value === "loading…"}
        />
        <Button
          icon={<Open />}
          label={`open ${channel}`}
          href={href}
          disabled={!href}
        />
      </div>
    </Card>
  );
}
