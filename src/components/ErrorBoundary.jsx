import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#0E1117", color: "#fff", flexDirection: "column", gap: 16, padding: 32 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>오류가 발생했습니다</h2>
          <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center" }}>{String(this.state.error?.message || this.state.error)}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ padding: "10px 24px", background: "#F97316", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
