import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installTelemetry } from "./core/telemetry";
import { initTheme } from "./core/theme";
import "./styles.css";

initTheme(); // before first paint — the theme never flashes
installTelemetry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
