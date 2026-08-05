import { Button } from "./Button";

interface StatusBarProps {
  isRunning?: boolean;
  progress?: number;
  operationCount?: number;
  onStart?: () => void;
  onCancel?: () => void;
}

export function StatusBar({
  isRunning = false,
  progress = 0,
  operationCount = 0,
  onStart,
  onCancel,
}: StatusBarProps) {
  return (
    <div className="bg-white border-t border-gray-300 px-6 py-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Progress Bar */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="mb-2 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">
              Operations: {operationCount.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button variant="primary" onClick={onStart}>
              Start
            </Button>
          ) : (
            <Button variant="danger" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
