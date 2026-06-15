import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import { CompanionApp } from "./app/CompanionApp";
import "./styles/global.css";
import { AppErrorBoundary, applyAccentColor, applyAppearance } from "./ui";

applyAppearance("system");
applyAccentColor();

const view = new URLSearchParams(window.location.search).get("view");
const Root = view === "companion" ? CompanionApp : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <Root />
    </AppErrorBoundary>
  </React.StrictMode>,
);
