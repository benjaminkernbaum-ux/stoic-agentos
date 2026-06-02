/**
 * Stoic AgentOS — Error Boundary
 * Catches rendering errors in children and displays a themed fallback UI.
 */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            textAlign: 'center',
            minHeight: 320,
            background: 'var(--surface-2, #111113)',
            borderRadius: 16,
            margin: 24,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2
            style={{
              color: 'var(--white, #fff)',
              fontSize: 20,
              fontWeight: 600,
              margin: '0 0 8px',
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 14,
              maxWidth: 420,
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}
          >
            {this.state.error?.message || 'An unexpected error occurred while rendering this section.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              background: 'var(--accent, #a78bfa)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
