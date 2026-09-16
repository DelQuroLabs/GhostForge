import { Component, type ReactNode } from 'react';

// Catches any render crash in the pages below it and shows a readable panel
// instead of React's white screen of death. Your books are untouched by a
// display crash — it only ever kills the current view.
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="empty">
          <div className="empty-title">Something broke on this page</div>
          <p>{error.message || 'An unexpected error stopped this page.'}</p>
          <p className="dim" style={{ fontSize: 12 }}>
            Your books are safe — this is a display crash, not data loss. A reload usually fixes it.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn soft btn-sm" onClick={() => window.location.reload()}>↻ Reload</button>
            <a className="btn ghost btn-sm" href="/">← Back to shelf</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
