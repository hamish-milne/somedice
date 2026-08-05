import DocsContent from "../content/docs.mdx";

export function DocumentationView() {
  return (
    <div className="bg-white px-6 py-8">
      <div className="max-w-4xl mx-auto prose prose-slate">
        <DocsContent />
      </div>
    </div>
  );
}
