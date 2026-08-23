import { AppShell } from "./components/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";

export function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
