import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import { CompanionApp } from "./app/CompanionApp";
import "./styles/global.css";
import { isTauriRuntime } from "./lib/tauri/runtime";
import { AppErrorBoundary, applyAccentColor, applyAppearance } from "./ui";

applyAppearance("system");
applyAccentColor();

if (isTauriRuntime()) {
  document.documentElement.dataset.tauri = "true";
}

const view = new URLSearchParams(window.location.search).get("view");
const Root = view === "companion" ? CompanionApp : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <Root />
    </AppErrorBoundary>
  </React.StrictMode>,
);
