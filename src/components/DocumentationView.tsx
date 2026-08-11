import type { ComponentProps } from "preact";
import DocsContent from "../content/docs.md";
import { useStore, useWatch } from "tinystate";

function LinkTargetBlank(props: ComponentProps<"a">) {
  return <a {...props} target="_blank" rel="noopener noreferrer" />;
}

export function DocumentationView() {
  const store = useStore();
  const isVisible = useWatch(store, "displayMode", (mode) => mode === "documentation", []);
  return (
    <div
      className="px-3 py-4 sm:px-6 sm:py-8 max-w-4xl mx-auto prose prose-slate data-hidden:hidden"
      data-hidden={isVisible ? undefined : true}
    >
      <DocsContent
        components={{
          a: LinkTargetBlank,
        }}
      />
    </div>
  );
}
