import SpecularButton from "@/app/_comps/ui/button";
import { icon_src } from "@/app/_comps/ui/small-widget";

export type Item = {
  name: string;
  info?: string;
  icon?: string;
  link?: string;
  distro?: string;
  kind?: string;
};

export type Info = {
  hardware?: Record<string, Item>;
  software?: {
    os?: Item | Item[];
    editors?: Item[];
    browser?: Item[];
    terminal?: Item[];
    "daily apps"?: Item[];
    tools?: Item[];
  };
};

export function Icon({ icon, className }: { icon?: string; className: string }) {
  const src = icon_src(icon);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

export function Row({ item }: { item: Item }) {
  const meta = [item.kind, item.info].filter(Boolean);

  return (
    <SpecularButton
      size="sm"
      radius={9}
      href={item.link}
      target={item.link ? "_blank" : undefined}
      autoAnimate={false}
      followMouse
      proximity={180}
      intensity={1.1}
      shineSize={12}
      tintOpacity={0.04}
      className="!flex w-full max-w-full !items-center !justify-start gap-3.5 !px-4 !py-3 text-left active:scale-100"
    >
      <Icon icon={item.icon} className="h-9 w-9 shrink-0 object-contain" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">
          {item.name}
        </span>
        {meta.length ? (
          <span className="mt-0.5 block truncate text-[11px] font-normal text-[var(--white)]/40">
            {meta.map((m, i) => (
              <span key={i}>
                {i > 0 ? <span className="mx-1.5 opacity-50">·</span> : null}
                {m}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </SpecularButton>
  );
}

export function Pill({ item }: { item: Item }) {
  return (
    <SpecularButton
      size="sm"
      radius={12}
      href={item.link}
      target={item.link ? "_blank" : undefined}
      autoAnimate={false}
      followMouse
      proximity={160}
      intensity={1.15}
      shineSize={12}
      tintOpacity={0.04}
      className="max-w-full !px-3 !py-2 text-[14px] font-medium tracking-[-0.01em] active:scale-100"
    >
      <Icon icon={item.icon} className="h-5 w-5 shrink-0 object-contain" />
      <span className="truncate">{item.name}</span>
    </SpecularButton>
  );
}

export function Rows({
  label,
  note,
  items,
}: {
  label: string;
  note: string;
  items: Item[];
}) {
  if (!items.length) return null;
  return (
    <section>
      <p className="mb-1 text-[12px] text-[var(--white)]/40"># {label}</p>
      <p className="mb-3 text-[13px] leading-5 text-[var(--white)]/35">{note}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <Row key={`${item.name}-${item.link || ""}`} item={item} />
        ))}
      </div>
    </section>
  );
}

export function Pills({
  label,
  note,
  items,
}: {
  label: string;
  note: string;
  items?: Item[];
}) {
  if (!items?.length) return null;
  return (
    <section>
      <p className="mb-1 text-[12px] text-[var(--white)]/40"># {label}</p>
      <p className="mb-3 text-[13px] leading-5 text-[var(--white)]/35">{note}</p>
      <div className="flex flex-wrap gap-2.5">
        {items.map((item) => (
          <Pill key={`${item.name}-${item.link || ""}`} item={item} />
        ))}
      </div>
    </section>
  );
}
