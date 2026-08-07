import { useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { CodeEditor } from "./components/CodeEditor";
import { StatusBar } from "./components/StatusBar";
import { DisplayModeSelector } from "./components/DisplayModeSelector";
import { ChartArea } from "./components/ChartArea";
import { ErrorView } from "./components/ErrorView";
import { DocumentationView } from "./components/DocumentationView";
import Runner from "./lib/runner?worker";
import type { Output } from "./lib/common";
import {
  createStore,
  listen,
  patch,
  peek,
  StoreProvider,
  useStore,
  useWatch,
  type AppStore,
} from "tinystate";
import { syncStorage } from "tinystate/utils";
import type { InputMessage, OutputMessage } from "./lib/runner";

export type DisplayMode = "exactly" | "atLeast" | "atMost" | "documentation";

// Toggle this to test error view
const HAS_ERROR = false;

declare global {
  interface AppState {
    displayMode: DisplayMode;
    inputCode: string;
    outputs: Output[];
    runState: "idle" | "running" | "error" | "starting" | "canceling";
    error: string;
    opCount: number;
    pcMax: number;
    programSize: number;
  }
}

const initialState: AppState = {
  displayMode: "exactly",
  inputCode: "",
  outputs: [],
  runState: "idle",
  error: "",
  opCount: 0,
  pcMax: 0,
  programSize: 1,
};

export default function App() {
  return (
    <StoreProvider
      value={() => {
        const store = createStore(initialState);
        syncStorage(store, localStorage, "appState");
        return store;
      }}
    >
      <Main />
    </StoreProvider>
  );
}

function createRunnerWorker(store: AppStore) {
  const runner = new Runner();
  runner.onmessage = (event) => {
    const msg = event.data as OutputMessage;
    console.log(msg);
    switch (msg.type) {
      case "error":
        patch(store, { runState: "error", error: msg.message });
        break;
      case "progress":
        patch(store, {
          runState: "running",
          opCount: msg.opCount,
          pcMax: msg.pcMax,
          programSize: msg.programSize,
        });
        break;
      case "result":
        patch(store, {
          runState: "idle",
          outputs: msg.outputs,
          pcMax: peek(store, "programSize"),
          opCount: msg.opCount,
        });
        break;
    }
  };
  return runner;
}

function RunnerManager() {
  const store = useStore();
  const runner = useRef<Worker>(null);
  useEffect(() => {
    runner.current = createRunnerWorker(store);
    return () => {
      runner.current?.terminate();
    };
  }, []);

  useEffect(
    () =>
      listen(store, "runState", (state) => {
        console.log("Run state changed to:", state);
        switch (state) {
          case "starting":
            runner.current?.postMessage({
              type: "run",
              programText: peek(store, "inputCode"),
            } satisfies InputMessage);
            break;
          case "canceling":
            runner.current?.terminate();
            runner.current = createRunnerWorker(store);
            patch(store, { runState: "idle" });
            break;
        }
      }),
    [],
  );

  return null;
}

function Main() {
  const store = useStore();
  const displayMode = useWatch(store, "displayMode");

  return (
    <div className="h-full min-w-85 flex flex-col bg-gray-100">
      <RunnerManager />
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
