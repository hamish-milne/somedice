import { formText, useStore } from "tinystate";

export function CodeEditor() {
  const store = useStore();
  return (
    <div className="h-full flex flex-col data-hidden:hidden">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 hidden sm:flex">
        <label htmlFor="inputCode" className="text-sm font-semibold text-gray-700">
          Code Editor
        </label>
      </div>
      <textarea
        spellcheck={false}
        autocorrect="off"
        autocapitalize="off"
        autocomplete="off"
        placeholder={"Enter your dice code here..."}
        className="flex-1 p-2 sm:p-4 font-mono text-sm resize-none border border-gray-300 outline-0 focus:outline-2 focus:outline-blue-500"
        {...formText(store, "inputCode")}
      />
    </div>
  );
}
