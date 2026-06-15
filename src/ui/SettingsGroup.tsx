import { createContext, useContext, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { glassStyles } from "./glassStyles";

const SettingsGroupContext = createContext(false);

export { SettingsGroupContext };

export function useSettingsGroup() {
  return useContext(SettingsGroupContext);
}

type SettingsGroupProps = {
  children: ReactNode;
  className?: string;
};

export function SettingsGroup({ children, className }: SettingsGroupProps) {
  return (
    <SettingsGroupContext.Provider value={true}>
      <div
        className={cn(
          "overflow-hidden",
          glassStyles.radiusCard,
          "border border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-row)]",
          className,
        )}
      >
        {children}
      </div>
    </SettingsGroupContext.Provider>
  );
}
