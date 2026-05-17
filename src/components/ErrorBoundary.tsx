import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#09090b', fontFamily: "'Outfit', sans-serif", padding: 32,
      }}>
        <div style={{
          background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12,
          padding: 40, maxWidth: 480, width: '100%', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#fafafa', marginBottom: 8, fontSize: 20 }}>Something went wrong</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.reset}
            style={{
              background: '#8A5CFF', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 24px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
}
