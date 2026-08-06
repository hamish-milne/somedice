import { formRadio, useStore } from "tinystate";
import { RadioButton } from "./Button";

type DisplayMode = "probability" | "cumulative" | "individual" | "documentation";

const modes: { value: DisplayMode; label: string }[] = [
  { value: "probability", label: "Probability" },
  { value: "cumulative", label: "Cumulative" },
  { value: "individual", label: "Individual" },
  { value: "documentation", label: "Documentation" },
];

export function DisplayModeSelector() {
  const store = useStore();
  return (
    <div className="bg-gray-50 border-b border-gray-300 px-6 py-3">
      <fieldset className="appearance-none flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700 mr-2">
          <legend>Display Mode</legend>
        </span>
        <div className="flex gap-1">
          {modes.map((m) => (
            <RadioButton
              key={m.value}
              className="text-sm px-3 py-1 has-checked:bg-blue-600! has-checked:text-white!"
              {...formRadio(store, "displayMode", m.value)}
            >
              {m.label}
            </RadioButton>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
