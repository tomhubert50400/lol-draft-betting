import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            backgroundColor: "var(--bg-primary)",
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: "600px",
              textAlign: "center",
            }}
          >
            <h1 style={{ color: "var(--accent-danger)", marginBottom: "1rem" }}>
              ⚠️ Something went wrong
            </h1>
            <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details
                style={{
                  marginBottom: "1.5rem",
                  textAlign: "left",
                  backgroundColor: "var(--bg-secondary)",
                  padding: "1rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.875rem",
                }}
              >
                <summary style={{ cursor: "pointer", marginBottom: "0.5rem" }}>
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "var(--text-secondary)",
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button onClick={this.handleReset} className="btn-primary">
                Go to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

