import { useEffect, type ReactNode } from "react";
import { bind } from "@/app/_comps/lib/terminal";
import { Background } from "@/app/_comps/ui/background";
import { Nav } from "@/app/_comps/ui/nav";

type Props = {
  children?: ReactNode;
};

function Page({ children }: Props) {
  useEffect(() => {
    bind();
  }, []);

  return (
    <main className="relative isolate min-h-screen bg-[var(--bg)] text-[var(--white)]">
      <Background />
      <Nav />
      {children}
    </main>
  );
}

export { Page };
