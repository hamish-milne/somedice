import { formText, useStore } from "tinystate";

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function CodeEditor({ placeholder = "Enter your dice code here..." }: CodeEditorProps) {
  const store = useStore();
  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
        <label htmlFor="inputCode" className="text-sm font-semibold text-gray-700">
          Code Editor
        </label>
      </div>
      <textarea
        spellCheck={false}
        placeholder={placeholder}
        className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
        {...formText(store, "inputCode")}
      />
    </div>
  );
}
