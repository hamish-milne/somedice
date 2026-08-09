import { patch, useStore, useWatch } from "tinystate";
import { Button } from "./Button";
import { useCallback } from "preact/hooks";

export function StatusBar() {
  const store = useStore();
  const operationCount = useWatch(store, "opCount");
  const isRunning = useWatch(store, "runState", (state) => state === "running", []);
  const pcMax = useWatch(store, "pcMax");
  const programSize = useWatch(store, "programSize");

  const onStart = useCallback(() => {
    patch(store as any, { runState: "starting" });
  }, [store]);

  const onCancel = useCallback(() => {
    patch(store as any, { runState: "canceling" });
  }, [store]);

  return (
    <div className="bg-white border-t border-gray-300 px-3 py-2 sm:px-6 sm:py-4 shadow-sm">
      <div className="flex flex-row items-center gap-4">
        {/* Progress Bar */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="mb-2 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">
              Operations: {operationCount.toLocaleString()}
            </span>
          </div>
          <progress
            className="w-full h-2.5 appearance-none rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
            value={pcMax}
            max={programSize}
          />
        </div>

        {/* Control Buttons */}
        {!isRunning ? (
          <Button className="w-24" variant="primary" onClick={onStart}>
            Start
          </Button>
        ) : (
          <Button className="w-24" variant="danger" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
