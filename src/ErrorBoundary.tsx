import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error in React component tree:", error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "40px", fontFamily: "sans-serif", backgroundColor: "#fff5f5", color: "#e53e3e", minHeight: "100vh" }}>
                    <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>🔥 MacroSnap Application Error</h1>
                    <p>We're sorry, an unexpected error occurred causing the application to crash.</p>
                    <div style={{ marginTop: "20px", padding: "16px", backgroundColor: "#fff", border: "1px solid #feb2b2", borderRadius: "8px", overflowX: "auto" }}>
                        <h3 style={{ fontWeight: "bold", marginBottom: "8px" }}>Error Details:</h3>
                        <pre style={{ margin: 0, fontSize: "14px" }}>{this.state.error?.toString()}</pre>
                        <details style={{ marginTop: "12px", whiteSpace: "pre-wrap", fontSize: "12px", color: "#4a5568" }}>
                            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>View Component Stack</summary>
                            <br />
                            {this.state.errorInfo?.componentStack}
                        </details>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: "24px", padding: "10px 20px", backgroundColor: "#e53e3e", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
