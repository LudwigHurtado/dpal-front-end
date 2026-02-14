import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('AppErrorBoundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 font-mono p-8">
          <div className="max-w-md text-center space-y-6">
            <p className="text-rose-500 text-sm font-black uppercase tracking-wider">Something went wrong</p>
            <p className="text-zinc-500 text-xs">
              The app hit an error. This can happen if report data is in an unexpected format.
            </p>
            <p className="text-zinc-400 text-[11px] break-words">
              {this.state.error?.message || 'Unknown client error'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider rounded-xl transition-colors"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={() => {
                  const keys = Object.keys(localStorage);
                  for (const k of keys) {
                    if (k.startsWith('dpal-')) localStorage.removeItem(k);
                  }
                  window.location.reload();
                }}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-wider rounded-xl transition-colors"
              >
                Reset Local Cache
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
