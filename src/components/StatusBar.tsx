import { listen, patch, useStore, useWatch } from "tinystate";
import { Button } from "./Button";
import { useCallback, useEffect, useRef } from "preact/hooks";

export function StatusBar() {
  const store = useStore();
  const operationCount = useWatch(store, "opCount");
  const isRunning = useWatch(store, "runState", (state) => state === "running", []);

  const onStart = useCallback(() => {
    patch(store, (state) => ({
      runState: "starting" as const,
      programCode: state.inputCode,
    }));
  }, [store]);

  const onCancel = useCallback(() => {
    patch(store, { runState: "canceling" });
  }, [store]);

  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      listen(store, "progress", (progress) => {
        if (progressRef.current) {
          progressRef.current.style.setProperty("--progress", `${progress * 100}%`);
        }
      }),
    [store],
  );

  return (
    <div className="flex flex-row items-center gap-4 bg-white border-t border-gray-300 px-3 py-2 sm:px-6 sm:py-4 shadow-sm">
      {/* Progress Bar */}
      <div className="flex-1 w-full sm:w-auto">
        <div className="mb-2 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">
            Operations: {operationCount.toLocaleString()}
          </span>
        </div>
        <div className="w-full h-2.5 appearance-none rounded-full overflow-hidden bg-gray-200">
          <div
            ref={progressRef}
            className="h-full transition-all w-(--progress) bg-blue-600"
          />
        </div>
      </div>

      {/* Control Buttons */}
      {!isRunning ? (
        <Button className="w-24" variant="primary" onClick={onStart}>
          Run
        </Button>
      ) : (
        <Button className="w-24" variant="danger" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  );
}
