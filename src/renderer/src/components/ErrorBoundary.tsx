import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      "Uncaught renderer error:",
      error.message,
      info.componentStack,
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-5 bg-bg-primary p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-danger" strokeWidth={1.75} />
          <div>
            <h1 className="text-lg font-semibold text-text-primary">
              Something went wrong
            </h1>
            <p className="mt-1 max-w-sm text-sm text-text-secondary">
              An unexpected error occurred. Your data is safe — reload the app
              to continue.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
