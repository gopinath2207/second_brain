/**
 * ErrorBoundary.jsx — React class-based error boundary.
 * Catches render errors and shows a themed fallback UI.
 */
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In production you'd send this to an error tracking service (Sentry, etc.)
    console.error('[Second Brain Error Boundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: 20, padding: 32,
          textAlign: 'center',
        }}>
          {/* Skull icon */}
          <div style={{
            fontSize: 64, lineHeight: 1,
            animation: 'pulseGreen 2s ease-in-out infinite',
            filter: 'drop-shadow(0 0 20px rgba(255,56,96,0.4))',
          }}>
            💀
          </div>

          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.4rem',
              color: 'var(--buster-500)', marginBottom: 8,
            }}>
              The Thousand Sunny Hit an Iceberg!
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 16px' }}>
              An unexpected error occurred. Don't worry — the crew is working on it.
            </p>

            {/* Error message */}
            <div style={{
              background: 'var(--bg-void)', border: '1px solid rgba(255,56,96,0.2)',
              borderRadius: 8, padding: '10px 16px', marginBottom: 20,
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--buster-500)',
              maxWidth: 560, margin: '0 auto 20px', textAlign: 'left', wordBreak: 'break-all',
            }}>
              {this.state.error?.message || 'Unknown error'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={this.handleReset}
            >
              ⚓ Try Again
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => window.location.href = '/dashboard'}
            >
              Return to Crow's Nest
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
