import DocsContent from "../content/docs.mdx";

export function DocumentationView() {
  return (
    <div className="px-3 py-4 sm:px-6 sm:py-8 max-w-4xl mx-auto prose prose-slate">
      <DocsContent />
    </div>
  );
}
