import { glassStyles } from "./glassStyles";

type PanelHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PanelHeader({ eyebrow, title, description }: PanelHeaderProps) {
  return (
    <header
      data-tauri-drag-region
      className={`mb-4 select-none border-b border-white/8 pb-4 ${glassStyles.panel} ${glassStyles.radiusCard} px-4 py-3`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-[#64d2ff]/90">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-lg font-semibold leading-snug text-white">{title}</h1>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-white/45">{description}</p>
    </header>
  );
}
