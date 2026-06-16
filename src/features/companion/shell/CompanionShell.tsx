import { useCompanionPresentationEnabled } from "../hooks/useCompanionPresentationEnabled";
import { useCompanionDevTools } from "../hooks/useCompanionDevTools";
import { useCompanionLayoutResync } from "../hooks/useCompanionLayoutResync";
import { useCompanionShell } from "../hooks/useCompanionShell";
import { ChatPanel } from "../chat/ChatPanel";
import { DailyCareNotePreview } from "../daily-care/DailyCareNotePreview";
import { MateAnchor } from "../presence/MateAnchor";
import { NudgeCard } from "../presence/NudgeCard";
import { CompanionViewport } from "./CompanionViewport";

export function CompanionShell() {
  const devToolsOpen = useCompanionDevTools();
  const presentationEnabled = useCompanionPresentationEnabled();
  const shell = useCompanionShell({ companionEnabled: presentationEnabled });
  useCompanionLayoutResync(shell.mode);

  const showNudge = shell.mode === "nudge";
  const showChat = shell.mode === "pocket" || shell.mode === "deep";
  const showMateAnchor =
    shell.mode !== "daily_care" &&
    (shell.mode === "quiet" ||
      shell.mode === "sleep" ||
      shell.mode === "new_note" ||
      showNudge ||
      showChat);

  return (
    <CompanionViewport>
      {presentationEnabled && showNudge ? (
        <NudgeCard
          personaName={shell.selectedPersona.name}
          nudge={shell.nudge}
          labels={shell.t}
          onOpen={() => void shell.openPocket()}
          onIgnore={() => void shell.ignoreNudge()}
        />
      ) : null}

      {presentationEnabled && showChat ? (
        <ChatPanel
          mode={shell.mode}
          mateIcon={shell.mateIcon}
          persona={shell.selectedPersona}
          messages={shell.messages}
          mates={shell.mateList}
          selectedPersonaId={shell.selectedPersonaId}
          timelineEvents={shell.timelineEvents}
          devToolsOpen={devToolsOpen}
          nightCareEnabled={shell.nightCareEnabled}
          isSending={shell.isSending}
          userName={shell.userName}
          labels={shell.t}
          onSend={(text) => void shell.sendMessage(text)}
          onClose={() => void shell.closePocket()}
          onMateSelect={shell.selectPersona}
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

      {presentationEnabled && showMateAnchor ? (
        <MateAnchor
          mode={shell.mode}
          mateIcon={shell.mateIcon}
          expanded={showNudge || showChat}
          labels={shell.t.presence}
          onClick={() => void shell.openIcon()}
        />
      ) : null}
    </CompanionViewport>
  );
}
