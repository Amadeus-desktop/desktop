type ReportCardProps = {
  label: string;
  value: string;
  accent: string;
};

export function ReportCard({ label, value, accent }: ReportCardProps) {
  return (
    <article className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
      <div className="text-[11px] leading-4 text-white/40">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent}`}>{value}</div>
    </article>
  );
}

