import { useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CodeXml,
  Home,
  Laptop,
  Link,
  Mail,
  Music,
} from "lucide-react";
import { SelectAnimation } from "@/app/_comps/ui/select-animation";

const links = [
  { name: "home", href: "/", icon: Home },
  { name: "music", href: "/music", icon: Music },
  { name: "projects", href: "/projects", icon: BriefcaseBusiness },
  { name: "my skills", href: "/skills", icon: CodeXml },
  { name: "environment", href: "/envoirment", icon: Laptop },
  { name: "noah", href: "/noah", icon: Link },
  { name: "contact", href: "/contact", icon: Mail },
];
function Nav() {
  const [active, setActive] = useState(-1);
  const [start, setStart] = useState(-1);
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const sync = () => {
      const path = location.pathname.replace(/\/+$/, "") || "/";
      const i = links.findIndex((l) => l.href === path);
      const prev = Number(sessionStorage.getItem("nav"));
      setStart(Number.isNaN(prev) || !sessionStorage.getItem("nav") ? i : prev);
      setActive(i);
      if (i >= 0) sessionStorage.setItem("nav", String(i));
    };
    sync();
    document.addEventListener("astro:page-load", sync);
    return () => document.removeEventListener("astro:page-load", sync);
  }, []);

  return (
    <nav
      aria-label="pages"
      className="font-satoshi fixed bottom-[calc(0.75rem_+_env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 rounded-xl border border-[#f7f7f718] bg-[#171717e8] p-1.5 shadow-[inset_0_1px_0_#f7f7f710,0_24px_60px_-32px_#171717] backdrop-blur-xl lg:top-1/2 lg:bottom-auto lg:left-4 lg:translate-x-0 lg:-translate-y-1/2"
    >
      <div className="relative flex gap-1 lg:flex-col">
        {active >= 0 ? (
          <SelectAnimation items={refs.current} index={active} start={start} />
        ) : null}
        {links.map((l, i) => (
          <a
            key={l.href}
            href={l.href}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-label={l.name}
            aria-current={i === active ? "page" : undefined}
            className={`group relative z-[1] flex h-10 w-10 items-center justify-center rounded-lg transition-[color,background-color] duration-200 focus-visible:bg-[#f7f7f70a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)] ${
              i === active
                ? "text-[var(--white)]"
                : "text-[#f7f7f766] hover:bg-[#f7f7f708] hover:text-[#f7f7f7c7]"
            }`}
          >
            <l.icon
              className="h-5 w-5 transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
              strokeWidth={2}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-full z-10 ml-3 hidden -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md border border-[#f7f7f714] bg-[#171717f5] px-2.5 py-1.5 text-[11px] font-medium tracking-wide text-[#f7f7f7c7] opacity-0 shadow-[0_12px_32px_-16px_#171717] transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none lg:block"
            >
              {l.name}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}

export { Nav, links };
