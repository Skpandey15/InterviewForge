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
      return (
        <div className="block-state" role="alert">
          <Icon name="alert-circle" size={36} />
          <p className="block-state__title">This module is unavailable right now</p>
          <p>
            The <strong>{this.props.remoteName}</strong> microfrontend could not be loaded. Check that its dev
            server is running.
          </p>
          <Button variant="outline" icon="refresh" onClick={() => this.setState({ error: null })}>
            Try again
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
