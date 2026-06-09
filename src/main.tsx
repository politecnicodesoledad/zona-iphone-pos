import React, { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./styles.css";

interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: "" };
  static getDerivedStateFromError(error: unknown): EBState {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[ZonaIPhone] Error capturado:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f0f", color: "#fff", fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
            <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#f59e0b" }}>Algo salió mal</h1>
            <p style={{ color: "#9ca3af", marginBottom: "1.5rem", maxWidth: "28rem" }}>{this.state.message}</p>
            <button onClick={() => window.location.reload()} style={{ background: "#f59e0b", color: "#000", border: "none", padding: "0.6rem 1.5rem", borderRadius: "0.375rem", cursor: "pointer", fontWeight: 600 }}>
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
