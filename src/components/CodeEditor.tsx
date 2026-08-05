interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function CodeEditor({
  value = "",
  onChange,
  placeholder = "Enter your dice code here...",
}: CodeEditorProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
        <h2 className="text-sm font-semibold text-gray-700">Code Editor</h2>
      </div>
      <textarea
        spellCheck={false}
        // value={value}
        // onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
      />
    </div>
  );
}
