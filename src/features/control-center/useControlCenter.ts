import { useState } from "react";
import type { ControlCenterTab } from "./tabs";

export function useControlCenter() {
  const [activeTab, setActiveTab] = useState<ControlCenterTab>("character");

  return {
    activeTab,
    selectTab: setActiveTab,
  };
}
