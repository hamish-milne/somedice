import { ButtonGroup, RadioButtonCompact } from "./Button";
import LayoutLeft from "../icons/layout-left.svg";
import LayoutRight from "../icons/layout-right.svg";
import LayoutSplit from "../icons/layout-split.svg";
import { formRadio, useStore } from "tinystate";

export function Header() {
  const store = useStore();
  return (
    <header className="flex items-center bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-md py-2 px-2 sm:py-6 sm:px-6">
      <h1 className="flex-1 text-xl sm:text-3xl font-bold">🎲 SomeDice</h1>
      <ButtonGroup>
        <RadioButtonCompact {...formRadio(store, "layout", "left")}>
          <img src={LayoutLeft} className="size-4 sm:size-6" />
        </RadioButtonCompact>
        <RadioButtonCompact {...formRadio(store, "layout", "split")}>
          <img src={LayoutSplit} className="size-4 sm:size-6" />
        </RadioButtonCompact>
        <RadioButtonCompact {...formRadio(store, "layout", "right")}>
          <img src={LayoutRight} className="size-4 sm:size-6" />
        </RadioButtonCompact>
      </ButtonGroup>
    </header>
  );
}
