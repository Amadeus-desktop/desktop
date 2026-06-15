import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import { CompanionApp } from "./app/CompanionApp";
import "./styles/global.css";

const view = new URLSearchParams(window.location.search).get("view");
const Root = view === "companion" ? CompanionApp : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
