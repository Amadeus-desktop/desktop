import type { ReactNode } from "react";

type MacWindowProps = {
  children: ReactNode;
};

export function MacWindow({ children }: MacWindowProps) {
  return (
    <section className="animate-window-appear flex h-[min(520px,calc(100vh-32px))] w-[min(760px,calc(100vw-32px))] overflow-hidden rounded-xl border border-white/12 bg-[#1e1e1e]/70 text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)] backdrop-blur-[40px] max-sm:h-[calc(100vh-20px)] max-sm:w-[calc(100vw-20px)] max-sm:flex-col">
      {children}
    </section>
  );
}
