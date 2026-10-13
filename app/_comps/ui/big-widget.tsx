import { icon_src } from "@/app/_comps/ui/small-widget";

type Props = {
  name: string;
  info?: string;
  icon?: string;
  link?: string;
};

function BigWidget({ name, info, icon, link }: Props) {
  const src = icon_src(icon);
  const inner = (
    <>
      <div className="flex items-start gap-3">
        {src ? (
          <img
            src={src}
            alt=""
            className="mt-0.5 h-9 w-9 shrink-0 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-medium">{name}</p>
          {info ? (
            <p className="mt-1 text-[13px] leading-snug text-[#6a6a6a]">
              {info}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );

  const className =
    "block rounded-2xl bg-[#ececec] p-4 text-[var(--black)] transition hover:bg-[#e2e2e2]";

  if (link) {
    return (
      <a href={link} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return <div className={className}>{inner}</div>;
}

export { BigWidget };
