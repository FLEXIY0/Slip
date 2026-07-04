import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register the PWA service worker in production web builds only.
// BASE_URL makes this work under any deploy path (root on Vercel, /<repo>/ on Pages).
if ("serviceWorker" in navigator && import.meta.env.PROD && !("__TAURI_INTERNALS__" in window)) {
  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {});
  });
}
