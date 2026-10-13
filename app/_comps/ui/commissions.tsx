import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ArrowUpRight, ChevronDown, X } from "lucide-react";
import { parse } from "yaml";
import raw from "@/app/data/commission.yaml?raw";
import SpecularButton from "@/app/_comps/ui/button";
import { Github } from "@/app/_comps/ui/icons";
import { icon_src } from "@/app/_comps/ui/small-widget";
import { SponsorBadge } from "@/app/_comps/ui/sponsor";

type Skill = {
  name: string;
  icon?: string;
  link?: string;
};

type Work = {
  more?: string;
  name?: string;
  description?: string;
  url?: string;
  site?: string;
  github?: string;
  logo?: string;
  banner?: string;
};

type Faq = {
  q: string;
  a: string;
};

type Data = {
  hero?: {
    tag?: string;
    title?: string;
    subtitle?: string;
    cta?: { label?: string; href?: string };
  };
  build?: string;
  skills?: Skill[];
  work?: Work;
  process?: string;
  rates?: string;
  get?: string;
  faq?: Faq[];
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const media_files = import.meta.glob(
  "../../../static/images/projects/**/*.{svg,png,jpg,jpeg,gif,webp,avif,ico,bmp}",
);

function slug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function served(path: string) {
  const norm = path.replace(/\\/g, "/");
  const i = norm.lastIndexOf("/images/projects/");
  return i === -1 ? "" : norm.slice(i);
}

function media(name: string) {
  const s = slug(name);
  let logo = "";
  let banner = "";
  for (const path of Object.keys(media_files)) {
    const url = served(path);
    const m = url.match(/\/images\/projects\/([^/]+)\/(logo|banner)\.[^.]+$/i);
    if (!m || m[1] !== s) continue;
    if (m[2].toLowerCase() === "logo") logo = url;
    else banner = url;
  }
  return { logo, banner };
}

function load(): Data {
  const data = parse(raw) as Data;
  if (!data.work?.name) return data;
  return {
    ...data,
    work: { ...data.work, ...media(data.work.name) },
  };
}

const data = load();

function gh(v?: string) {
  if (!v) return "";
  return v.startsWith("http") ? v : `https://github.com/${v}`;
}

function Rich({ text }: { text: string }) {
  const parts = text.split(
    /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g,
  );
  return (
    <>
      {parts.map((part, i) => {
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          const href = link[2];
          const external = /^https?:\/\//i.test(href);
          return (
            <a
              key={i}
              href={href}
              {...(external
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
              className="underline decoration-[var(--white)]/25 underline-offset-[3px] transition-colors hover:text-[var(--white)]/80 hover:decoration-[var(--white)]/50"
            >
              {link[1]}
            </a>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-[var(--white)]/80">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
          return (
            <code
              key={i}
              className="rounded-[4px] bg-[var(--white)]/[0.08] px-1 py-px font-mono text-[0.92em] text-[var(--white)]/75"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 1) {
          return (
            <em key={i} className="font-medium italic">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function Title({ text }: { text: string }) {
  return <Rich text={text} />;
}

function Img({
  src,
  className = "",
  style,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [on, setOn] = useState(false);
  return (
    <img
      key={src}
      src={src}
      alt=""
      draggable={false}
      style={style}
      ref={(el) => {
        if (el?.complete && el.naturalWidth) setOn(true);
      }}
      onLoad={() => setOn(true)}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
      className={`fade ${on ? "on" : ""} ${className}`}
    />
  );
}

function Section({
  label,
  extra,
  children,
}: {
  label: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[12px] text-[var(--white)]/40"># {label}</p>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Text({ value }: { value: string }) {
  return (
    <p className="max-w-[36rem] text-[14px] leading-6 whitespace-pre-line text-[var(--white)]/55">
      <Rich text={value.trim()} />
    </p>
  );
}

function SkillChip({ item }: { item: Skill }) {
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

function WorkCard({ item }: { item: Work }) {
  const site = item.url || item.site || "";
  const github = gh(item.github);
  const name = item.name || "";

  return (
    <div className="flex w-full items-center gap-3.5 rounded-[12px] border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.03] p-3.5 transition-colors hover:border-[var(--white)]/[0.14] hover:bg-[var(--white)]/[0.045] sm:gap-4 sm:p-4">
      {item.logo ? (
        <Img
          src={item.logo}
          className="h-14 w-14 shrink-0 rounded-[10px] object-cover sm:h-16 sm:w-16"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-[var(--white)]/[0.06] text-[18px] font-semibold tracking-[-0.03em] text-[var(--white)]/35 sm:h-16 sm:w-16">
          {name.slice(0, 1).toLowerCase() || "·"}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] leading-none font-semibold tracking-[-0.02em] sm:text-[17px]">
          {name}
        </h3>
        {item.description ? (
          <p className="mt-1.5 text-[13px] leading-5 text-[var(--white)]/48 sm:text-[13.5px] sm:leading-[1.45]">
            {item.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {site ? (
          <SpecularButton
            size="sm"
            radius={8}
            href={site}
            target="_blank"
            autoAnimate={false}
            followMouse
            proximity={140}
            intensity={1.15}
            shineSize={12}
            tintOpacity={0.05}
            className="!px-3 !py-2 text-[12px] font-medium tracking-[-0.01em] active:scale-100 [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            <span>view</span>
            <ArrowUpRight strokeWidth={2.25} />
          </SpecularButton>
        ) : null}
        {github ? (
          <SpecularButton
            size="sm"
            radius={8}
            href={github}
            target="_blank"
            autoAnimate={false}
            followMouse
            proximity={140}
            intensity={1.15}
            shineSize={12}
            tintOpacity={0.05}
            className="!px-2.5 !py-2 active:scale-100 [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            <Github />
          </SpecularButton>
        ) : null}
      </div>
    </div>
  );
}

function FaqItem({ item }: { item: Faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--white)]/[0.08] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
      >
        <span className="text-[14px] font-medium tracking-[-0.01em] text-[var(--white)]/90">
          <Rich text={item.q} />
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--white)]/35 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>
      {open ? (
        <p className="pb-3.5 text-[13px] leading-5 text-[var(--white)]/45">
          <Rich text={item.a} />
        </p>
      ) : null}
    </div>
  );
}

function Body({ data, onClose }: { data: Data; onClose: () => void }) {
  const hero = data.hero;
  const work = data.work?.name ? data.work : null;

  return (
    <div className="space-y-10">
      <header className="relative pr-10">
        <p className="text-[11px] text-[var(--white)]/35">
          # {hero?.tag || "commissions"}
        </p>
        <h2 className="font-array mt-1 text-[clamp(1.7rem,4.5vw,2.15rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
          <Title text={hero?.title || "let's build something"} />
        </h2>
        {hero?.subtitle ? (
          <p className="mt-3 max-w-[32rem] text-[14px] leading-6 text-[var(--white)]/50">
            {hero.subtitle}
          </p>
        ) : null}
        {hero?.cta?.href ? (
          <div className="mt-5">
            <SpecularButton
              size="sm"
              radius={999}
              href={hero.cta.href}
              autoAnimate={false}
              followMouse
              proximity={140}
              intensity={1.1}
              shineSize={12}
              tintOpacity={0.04}
              className="!px-4 !py-2 text-[13px] font-medium tracking-[-0.01em] active:scale-100"
              onClick={onClose}
            >
              <span>{hero.cta.label || "get in touch"}</span>
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
            </SpecularButton>
          </div>
        ) : null}
      </header>

      {data.build ? (
        <Section label="what i build">
          <Text value={data.build} />
        </Section>
      ) : null}

      {data.skills?.length ? (
        <Section label="some skills">
          <div className="flex flex-wrap gap-2.5">
            {data.skills.map((item) => (
              <SkillChip
                key={`${item.name}-${item.link || ""}`}
                item={item}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {work ? (
        <Section
          label="recent work"
          extra={
            work.more ? (
              <a
                href={work.more}
                onClick={onClose}
                className="text-[12px] text-[var(--white)]/35 transition-colors hover:text-[var(--white)]/60"
              >
                see more →
              </a>
            ) : null
          }
        >
          <WorkCard item={work} />
        </Section>
      ) : null}

      {data.process ? (
        <Section label="how it will go down">
          <Text value={data.process} />
        </Section>
      ) : null}

      {data.rates ? (
        <Section label="rates">
          <Text value={data.rates} />
        </Section>
      ) : null}

      {data.get ? (
        <Section label="what you get">
          <Text value={data.get} />
        </Section>
      ) : null}

      {data.faq?.length ? (
        <Section label="faq">
          <div className="rounded-[10px] border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.025] px-4">
            {data.faq.map((item) => (
              <FaqItem key={item.q} item={item} />
            ))}
          </div>
        </Section>
      ) : null}

      {hero?.cta?.href ? (
        <div className="border-t border-[var(--white)]/[0.07] pt-8 text-center">
          <p className="text-[13px] text-[var(--white)]/40">ready when you are</p>
          <a
            href={hero.cta.href}
            onClick={onClose}
            className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-medium tracking-[-0.01em] text-[var(--white)]/80 transition-colors hover:text-[var(--white)]"
          >
            {hero.cta.label || "get in touch"}
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
          </a>
          <div className="mt-4 w-full">
            <SponsorBadge className="!flex !w-full !min-w-0 !justify-center !px-10 !py-2.5" />
          </div>
        </div>
      ) : (
        <div className="w-full">
          <SponsorBadge className="!flex !w-full !min-w-0 !justify-center !px-10 !py-2.5" />
        </div>
      )}
    </div>
  );
}

function CommissionsModal({ open, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="font-satoshi fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="commissions"
    >
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-[#0a0a0a]/72 backdrop-blur-[6px]"
      />

      <div
        ref={panel}
        className="relative z-[1] flex max-h-[92svh] w-full max-w-[40rem] flex-col overflow-hidden rounded-t-[18px] border border-[var(--white)]/[0.1] bg-[#111] shadow-[0_40px_100px_-40px_#000] sm:max-h-[88svh] sm:rounded-[18px]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="close commissions"
          className="absolute top-3.5 right-3.5 z-[2] flex h-9 w-9 items-center justify-center rounded-full text-[var(--white)]/40 transition-colors hover:bg-[var(--white)]/[0.06] hover:text-[var(--white)]/80"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="comm-scroll overflow-y-auto overscroll-contain px-5 py-6 sm:px-7 sm:py-8">
          <Body data={data} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

export { CommissionsModal };
