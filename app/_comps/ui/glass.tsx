import type { CSSProperties, PointerEvent, ReactNode } from "react";

function track(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

const glass =
  "glow border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.025] shadow-[inset_0_1px_0_#f7f7f708,0_24px_50px_-36px_#171717cc] backdrop-blur-sm transition-[transform,border-color,background-color] duration-300 ease-out hover:-translate-y-px hover:border-[var(--white)]/[0.14] hover:bg-[var(--white)]/[0.04] motion-reduce:transform-none motion-reduce:transition-none";

type CardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function Card({ children, className = "", style }: CardProps) {
  return (
    <div
      onPointerMove={track}
      style={style}
      className={`${glass} rounded-[10px] [--glow:240px] ${className}`}
    >
      {children}
    </div>
  );
}

function Tile({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[7px] border border-[var(--white)]/[0.09] bg-[var(--white)]/[0.04] text-[var(--white)] shadow-[inset_0_1px_0_#f7f7f708] ${className}`}
    >
      {children}
    </div>
  );
}

type ButtonProps = {
  icon: ReactNode;
  label?: string;
  href?: string;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
};

const btn =
  "glow inline-flex cursor-pointer select-none items-center justify-center gap-1.5 rounded-[6px] border border-[var(--white)]/[0.11] bg-[var(--white)]/[0.05] text-[12px] font-medium text-[var(--white)]/75 outline-none transition-[transform,color,border-color,background-color] duration-200 hover:border-[var(--white)]/[0.2] hover:bg-[var(--white)]/[0.09] hover:text-[var(--white)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--white)]/50 active:scale-[0.97] disabled:cursor-default disabled:opacity-35 disabled:active:scale-100 motion-reduce:transform-none motion-reduce:transition-none [--glow:80px] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0";

function Button({
  icon,
  label,
  href,
  onClick,
  children,
  className = "",
  disabled = false,
}: ButtonProps) {
  const text = children ? <span>{children}</span> : null;
  const cls = `${btn} ${text ? "h-8 px-3" : "h-8 w-8"} ${className}`;
  const inner = (
    <>
      <span className="flex opacity-80">{icon}</span>
      {text}
    </>
  );

  if (href && !disabled) {
    const external = href.startsWith("http");
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        aria-label={label}
        title={label}
        onPointerMove={track}
        className={cls}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onPointerMove={track}
      disabled={disabled}
      className={cls}
    >
      {inner}
    </button>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[4px] border border-[var(--white)]/[0.08] bg-[var(--white)]/[0.05] px-1.5 py-0.5 font-medium tabular-nums text-[var(--white)]/80">
      {children}
    </span>
  );
}

export { Card, Tile, Button, Chip };
