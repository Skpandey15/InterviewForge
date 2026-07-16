import { Component, Suspense, type ReactNode } from 'react';
import { Button, Icon, Spinner } from '@aip/shared';

interface ErrorBoundaryProps {
  remoteName: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class RemoteErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error(`[shell] Failed to render remote "${this.props.remoteName}"`, error);
  }

  render() {
    if (this.state.error) {
      // In production the usual cause is a stale tab: the app was redeployed and
      // the code-split chunk this page asked for no longer exists. Re-rendering
      // would request the same missing chunk forever — only a reload recovers,
      // because it fetches fresh HTML and the new chunk hashes.
      const isDev = Boolean((import.meta as unknown as { env?: Record<string, unknown> }).env?.DEV);
      return (
        <div className="block-state" role="alert">
          <Icon name="alert-circle" size={36} />
          <p className="block-state__title">This module is unavailable right now</p>
          <p>
            The <strong>{this.props.remoteName}</strong> module could not be loaded.{' '}
            {isDev
              ? 'Check that its dev server is running.'
              : 'The app may have been updated since this tab was opened — reloading usually fixes it.'}
          </p>
          <Button variant="outline" icon="refresh" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface RemoteBoundaryProps {
  remoteName: string;
  children: ReactNode;
}

/** Suspense + error isolation wrapper for every federated remote. */
export function RemoteBoundary({ remoteName, children }: RemoteBoundaryProps) {
  return (
    <RemoteErrorBoundary remoteName={remoteName}>
      <Suspense
        fallback={
          <div className="block-state">
            <Spinner size={28} />
            <p>Loading…</p>
          </div>
        }
      >
        {children}
      </Suspense>
    </RemoteErrorBoundary>
  );
}
