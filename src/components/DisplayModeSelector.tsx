import { formRadio, useStore } from "tinystate";
import { RadioButton } from "./Button";
import type { DisplayMode } from "../App";

const modes: { value: DisplayMode; label: string }[] = [
  { value: "exactly", label: "Exactly" },
  { value: "atLeast", label: "At Least" },
  { value: "atMost", label: "At Most" },
  { value: "documentation", label: "Documentation" },
];

export function DisplayModeSelector() {
  const store = useStore();
  return (
    <div className="bg-gray-50 border-b border-gray-300 p-3 overflow-x-auto">
      <fieldset className="appearance-none flex items-center gap-2">
        <div className="flex gap-1">
          {modes.map((m) => (
            <RadioButton
              key={m.value}
              className="text-sm has-[*]:py-1 has-[*]:px-2 sm:px-4 sm:py-2 has-checked:bg-blue-600! has-checked:text-white!"
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
