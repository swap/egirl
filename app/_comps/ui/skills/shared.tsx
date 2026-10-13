import SpecularButton from "@/app/_comps/ui/button";
import { icon_src } from "@/app/_comps/ui/small-widget";

export type Item = {
  name: string;
  icon?: string;
  link?: string;
};

export type Skills = {
  languages?: Item[];
  "frameworks & libraries"?: Item[];
  tools?: Item[];
};

export function Skill({ item }: { item: Item }) {
  const src = icon_src(item.icon);

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
      {src ? (
        <img
          src={src}
          alt=""
          className="h-5 w-5 shrink-0 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--white)]/10 text-[10px] uppercase text-[var(--white)]/50">
          {item.name.slice(0, 1)}
        </span>
      )}
      <span className="truncate">{item.name}</span>
    </SpecularButton>
  );
}

export function Group({
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
          <Skill key={`${item.name}-${item.link || ""}`} item={item} />
        ))}
      </div>
    </section>
  );
}
