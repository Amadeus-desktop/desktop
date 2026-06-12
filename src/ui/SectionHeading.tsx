type SectionHeadingProps = {
  children: string;
};

export function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <h3 className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-normal text-white/40">
      {children}
    </h3>
  );
}
