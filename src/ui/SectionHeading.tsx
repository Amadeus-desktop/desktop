type SectionHeadingProps = {
  children: string;
};

export function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <h3 className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
      {children}
    </h3>
  );
}
