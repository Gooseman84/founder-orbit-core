import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportError } from "@/lib/errorReporter";

// Global unhandled error tracking
window.addEventListener("error", (event) => {
  if (event.error) reportError({ error: event.error, componentName: "window.onerror" });
});
window.addEventListener("unhandledrejection", (event) => {
  const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
  reportError({ error, componentName: "unhandledrejection" });
});

createRoot(document.getElementById("root")!).render(<App />);
