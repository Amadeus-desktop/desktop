import { PersonaPresenceIcon } from "../features/companion/ui/PersonaPresenceIcon";
import { useSettings } from "../features/settings/useSettings";

type SidebarBrandProps = {
  appName: string;
  subtitle: string;
};

export function SidebarBrand({ appName, subtitle }: SidebarBrandProps) {
  const { companionPersonaId } = useSettings();

  return (
    <div
      data-tauri-drag-region
      className="min-w-0 select-none px-2 pb-2 pt-0.5 max-sm:hidden"
    >
      <div className="flex items-center gap-2.5">
        <PersonaPresenceIcon personaId={companionPersonaId} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-white">{appName}</div>
          <div className="mt-0.5 truncate text-[10px] leading-4 text-white/40">
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}
