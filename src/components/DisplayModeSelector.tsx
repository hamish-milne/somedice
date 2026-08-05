import { Button } from "./Button";

type DisplayMode = "probability" | "cumulative" | "individual" | "documentation";

interface DisplayModeSelectorProps {
  mode?: DisplayMode;
  onModeChange?: (mode: DisplayMode) => void;
}

const modes: { value: DisplayMode; label: string }[] = [
  { value: "probability", label: "Probability" },
  { value: "cumulative", label: "Cumulative" },
  { value: "individual", label: "Individual" },
  { value: "documentation", label: "Documentation" },
];

export function DisplayModeSelector({
  mode = "probability",
  onModeChange,
}: DisplayModeSelectorProps) {
  return (
    <div className="bg-gray-50 border-b border-gray-300 px-6 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700 mr-2">Display Mode:</span>
        <div className="flex gap-1">
          {modes.map((m) => (
            <Button
              key={m.value}
              variant={mode === m.value ? "primary" : "secondary"}
              onClick={() => onModeChange?.(m.value)}
              className="text-sm px-3 py-1"
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
