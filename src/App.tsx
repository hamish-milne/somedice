import { useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { CodeEditor } from "./components/CodeEditor";
import { StatusBar } from "./components/StatusBar";
import { DisplayModeSelector } from "./components/DisplayModeSelector";
import { ChartArea } from "./components/ChartArea";
import { ErrorView } from "./components/ErrorView";
import { DocumentationView } from "./components/DocumentationView";
import Runner from "./lib/runner?worker";
import type { Output } from "./lib/vm";
import { useCreateStore, useWatch } from "tinystate";

type DisplayMode = "probability" | "cumulative" | "individual" | "documentation";

// Toggle this to test error view
const HAS_ERROR = false;

declare global {
  interface AppState {
    displayMode: DisplayMode;
    inputCode: string;
    outputs: Output[];
    runState: "idle" | "running" | "error";
    error: string;
    opCount: number;
  }
}

export default function App() {
  const runner = useRef<Worker>(null);
  useEffect(() => {
    runner.current = new Runner();
    runner.current.onmessage = (event) => {
      console.log("Message from worker:", event.data);
    };
    return () => {
      runner.current?.terminate();
    };
  }, []);

  const store = useCreateStore<AppState, true>({
    displayMode: "probability",
    inputCode: "",
    outputs: [],
    runState: "idle",
    error: "",
    opCount: 0,
  });

  const displayMode = useWatch(store, "displayMode");

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-0 overflow-hidden">
        {/* Left Panel: Code Editor */}
        <div className="flex flex-col h-1/2 lg:h-full border-r border-gray-300">
          <CodeEditor />
        </div>

        {/* Right Panel: Display Mode Selector and Chart */}
        <div className="flex flex-col h-1/2 lg:h-full lg:min-h-0">
          <DisplayModeSelector />
          <div className="flex-1 overflow-auto min-h-0">
            {HAS_ERROR ? (
              <ErrorView />
            ) : displayMode === "documentation" ? (
              <DocumentationView />
            ) : (
              <ChartArea />
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}
