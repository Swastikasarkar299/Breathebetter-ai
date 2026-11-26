import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected rendering error.' };
  }

  componentDidCatch(error, info) {
    console.error('[BreatheBetter ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="surface-card p-8 text-center max-w-lg mx-auto my-10 space-y-4">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-red-500/15 text-red-500">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Something went wrong displaying this section
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {this.state.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="btn-brand px-4 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <RotateCcw size={13} /> Reload Section
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
