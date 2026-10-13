import type { ReactNode } from "react";
import SpecularButton from "@/app/_comps/ui/button";

const btn =
  "!px-2.5 !py-1.5 text-[14px] font-medium tracking-[-0.01em] active:scale-100 [&_svg]:h-4 [&_svg]:w-4";

export function Action({
  icon,
  label,
  href,
  delay,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  delay: number;
  onClick?: () => void;
}) {
  const external = href?.startsWith("http") || href?.startsWith("mailto:");
  return (
    <div className="rise" style={{ animationDelay: `${delay}ms` }}>
      <SpecularButton
        size="sm"
        radius={7}
        href={href}
        target={external && href && !href.startsWith("mailto:") ? "_blank" : undefined}
        onClick={onClick}
        autoAnimate={false}
        followMouse
        proximity={140}
        intensity={1.15}
        shineSize={12}
        tintOpacity={0.05}
        className={btn}
      >
        <span className="flex opacity-80">{icon}</span>
        {label}
      </SpecularButton>
    </div>
  );
}
