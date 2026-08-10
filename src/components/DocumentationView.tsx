import type { ComponentProps } from "preact";
import DocsContent from "../content/docs.md";

function LinkTargetBlank(props: ComponentProps<"a">) {
  return <a {...props} target="_blank" rel="noopener noreferrer" />;
}

export function DocumentationView() {
  return (
    <div className="px-3 py-4 sm:px-6 sm:py-8 max-w-4xl mx-auto prose prose-slate">
      <DocsContent
        components={{
          a: LinkTargetBlank,
        }}
      />
    </div>
  );
}
