export function App(): JSX.Element {
  return (
    <div className="flex h-screen w-screen flex-col bg-bg-primary text-text-primary">
      <BacklogView />
    </div>
  );
}

import { BacklogView } from "./components/BacklogView";
