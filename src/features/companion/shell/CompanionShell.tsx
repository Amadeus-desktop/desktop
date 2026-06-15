import { useCompanionPresentationEnabled } from "../hooks/useCompanionPresentationEnabled";
import { useCompanionDevTools } from "../hooks/useCompanionDevTools";
import { useCompanionShell } from "../hooks/useCompanionShell";
import { DailyCareNotePreview } from "../daily-care/DailyCareNotePreview";
import { PocketChat } from "../chat/PocketChat";
import { FloatingMessageIcon } from "../presence/FloatingMessageIcon";
import { NudgeNote } from "../presence/NudgeNote";
import { CompanionViewport } from "./CompanionViewport";

export function CompanionShell() {
  const devToolsOpen = useCompanionDevTools();
  const presentationEnabled = useCompanionPresentationEnabled();
  const shell = useCompanionShell({ companionEnabled: presentationEnabled });

  return (
    <CompanionViewport>
      {presentationEnabled && shell.mode === "nudge" ? (
        <NudgeNote
          personaId={shell.selectedPersonaId}
          personaName={shell.selectedPersona.name}
          nudge={shell.nudge}
          labels={shell.t}
          onOpen={() => void shell.openPocket()}
          onDismiss={() => void shell.dismissNudge()}
          onIgnore={() => void shell.ignoreNudge()}
        />
      ) : null}

      {presentationEnabled && (shell.mode === "pocket" || shell.mode === "deep") ? (
        <PocketChat
          mode={shell.mode}
          persona={shell.selectedPersona}
          personas={shell.personaList}
          selectedPersonaId={shell.selectedPersonaId}
          messages={shell.messages}
          draft={shell.draft}
          timelineEvents={shell.timelineEvents}
          devToolsOpen={devToolsOpen}
          nightCareEnabled={shell.nightCareEnabled}
          labels={shell.t}
          onDraftChange={shell.setDraft}
          onSubmit={() => void shell.sendMessage()}
          onClose={() => void shell.closePocket()}
          onPersonaSelect={shell.selectPersona}
          onOpenDailyCare={() => void shell.openDailyCare()}
        />
      ) : null}

      {presentationEnabled && shell.mode === "daily_care" ? (
        <DailyCareNotePreview
          timelineEvents={shell.timelineEvents}
          devToolsOpen={devToolsOpen}
          labels={shell.t}
          onClose={() => void shell.closeDailyCare()}
        />
      ) : null}

      {presentationEnabled && shell.showPresence ? (
        <FloatingMessageIcon
          mode={shell.mode}
          personaId={shell.selectedPersonaId}
          labels={shell.t.presence}
          onClick={() => void shell.openIcon()}
        />
      ) : null}
    </CompanionViewport>
  );
}
