/**
 * Error boundary — trust through design (CODEX 00 E.7): if a view ever throws,
 * the Builder sees a calm, honest message and a way forward, never a blank screen
 * or lost work. Business Memory is safe (append-only, already persisted), so
 * reloading always recovers.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "../core/telemetry";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, `boundary${info.componentStack ? ":" + info.componentStack.split("\n")[1]?.trim() : ""}`);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="onboarding">
          <div className="panel">
            <div className="wordmark">ZYVORA</div>
            <h1>Something went wrong on this screen.</h1>
            <p>
              Your business data is safe — Business Memory is append-only and already
              saved. Reloading will recover the app.
            </p>
            <p className="confidence-note">{this.state.error.message}</p>
            <div className="actions">
              <button className="btn" onClick={() => location.reload()}>Reload ZYVORA</button>
              <button className="btn subtle" onClick={() => this.setState({ error: null })}>Try this screen again</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
