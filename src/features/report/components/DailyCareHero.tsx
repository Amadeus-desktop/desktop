type DailyCareHeroProps = {
  prompt: string;
};

export function DailyCareHero({ prompt }: DailyCareHeroProps) {
  return (
    <div className="mb-4 rounded-[20px] border border-[color:rgb(var(--accent-rgb)/0.22)] bg-gradient-to-br from-[color:rgb(var(--accent-rgb)/0.14)] via-[#2a2228] to-[#222226] px-4 py-3.5">
      <p className="text-[13px] leading-6 text-[color:var(--accent-soft)]">{prompt}</p>
    </div>
  );
}
