import { LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
import {
  Button,
  MacInput,
  PanelHeader,
  SettingRow,
  SettingsGroup,
  shellText,
  UserAvatar,
} from "../../../ui";
import { useSettings, ModelRoutePicker } from "../../settings";
import { useAuth } from "../hooks/useAuth";

type ProfilePanelProps = {
  onOpenSettings: () => void;
};

export function ProfilePanel({ onOpenSettings }: ProfilePanelProps) {
  const t = useI18n();
  const p = t.auth.profile;
  const { user, signOutWithTransition } = useAuth();
  const { nickname, setNickname, modelRoute, setModelRoute } = useSettings();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOutWithTransition();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <PanelHeader eyebrow={p.eyebrow} title={p.title} description={p.description} />

      <div
        className="flex flex-col items-center gap-3 rounded-[22px] border border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-panel)] px-6 py-6"
      >
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-16" />
        <div className="text-center">
          <p className={cn("text-base font-semibold", shellText.primary)}>{user.name}</p>
          <p className={cn("mt-1 text-[12px]", shellText.muted)}>{user.email}</p>
        </div>
        <span
          className="rounded-full border border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-panel-strong)] px-3 py-1 text-[10px] font-medium text-[color:var(--shell-ink-muted)]"
        >
          {t.auth.account.signedInAs}
        </span>
      </div>

      <SettingsGroup>
        <SettingRow
          layout="stack"
          title={p.modelRouteLabel}
          subtitle={p.modelRouteHint}
        >
          <ModelRoutePicker value={modelRoute} onChange={setModelRoute} />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup>
        <SettingRow title={p.displayNameLabel} subtitle={p.displayNameHint}>
          <MacInput
            value={nickname}
            onChange={setNickname}
            label={p.displayNameLabel}
            className="w-full max-w-xs"
          />
        </SettingRow>
        <SettingRow title={p.emailLabel} subtitle={user.email}>
          <span className={cn("text-[12px]", shellText.muted)}>{user.email}</span>
        </SettingRow>
      </SettingsGroup>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="md"
          className="gap-2"
          onClick={onOpenSettings}
        >
          <Settings className="size-3.5" strokeWidth={2} />
          {p.openSettings}
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="gap-2"
          disabled={loggingOut}
          onClick={() => void handleLogout()}
        >
          <LogOut className="size-3.5" strokeWidth={2} />
          {loggingOut ? t.auth.account.loggingOut : t.auth.account.logout}
        </Button>
      </div>
    </div>
  );
}
