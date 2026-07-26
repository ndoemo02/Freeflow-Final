import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LaunchSequence from "./components/LaunchSequence";
import "@fontsource/satisfy/400.css";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { useState } from "react";
import {
  getLaunchSequenceDecision,
  markLaunchSequenceSeen,
} from "./lib/launchSequence";

function FreeFlowBootstrap() {
  const [launchDecision] = useState(getLaunchSequenceDecision);
  const [launchComplete, setLaunchComplete] = useState(!launchDecision.shouldShow);

  const completeLaunch = () => {
    if (launchDecision.shouldPersist) {
      markLaunchSequenceSeen();
    }
    setLaunchComplete(true);
  };

  if (!launchComplete) {
    return <LaunchSequence onComplete={completeLaunch} />;
  }

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FreeFlowBootstrap />
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[PWA] Service worker registration failed:', error);
    });
  });
}
