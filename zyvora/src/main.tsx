import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installTelemetry } from "./core/telemetry";
import "./styles.css";

installTelemetry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
