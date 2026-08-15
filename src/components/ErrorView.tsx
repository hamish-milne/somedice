import { useStore, useWatch } from "tinystate";

const ERROR_TITLES = {
  syntax: "Syntax Error",
  compiler: "Compilation Error",
  runtime: "Runtime Error",
  unknown: "Unknown Error",
};

const ERROR_CONTEXT = 2; // Number of lines of context to show around the error line

export function ErrorView() {
  const store = useStore();
  const inputCode = useWatch(store, "inputCode");
  const error = useWatch(store, "error");
  const displayMode = useWatch(store, "displayMode");
  const displayState = useWatch(store, "displayState");
  const isVisible = displayState === "error" && displayMode !== "documentation";

  const { errorType, message, debugInfo } = error;
  const lines = inputCode.split("\n");
  const title = ERROR_TITLES[errorType] || "Error";

  // Get the primary error location (most recent frame)
  const primaryLocation = debugInfo[0]?.location;
  const errorLine = primaryLocation ? primaryLocation[0] : null;
  const errorColumn = primaryLocation ? primaryLocation[1] : null;

  const snippetStart = errorLine !== null ? Math.max(0, errorLine - ERROR_CONTEXT) : 0;
  const snippetEnd =
    errorLine !== null ? Math.min(lines.length, errorLine + ERROR_CONTEXT + 1) : lines.length;
  const snippetLines = lines.slice(snippetStart, snippetEnd);

  return (
    <div
      className="h-full overflow-auto data-hidden:hidden"
      data-hidden={isVisible ? undefined : true}
    >
      <div className="max-w-5xl mx-auto p-4">
        {/* Error Header - Compact */}
        <div className="mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-start gap-2 mb-1">
            <svg
              className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-700 mt-0.5">{message}</p>
              {errorLine !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  at line {errorLine + 1}
                  {errorColumn !== null && `, column ${errorColumn + 1}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Code Snippet - Compact */}
        {errorLine !== null && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Code
            </div>
            <div className="bg-gray-900 rounded overflow-hidden text-xs font-mono">
              {snippetLines.map((line, index) => {
                const lineNumber = snippetStart + index;
                const isErrorLine = lineNumber === errorLine;

                return (
                  <div key={index} className={`flex ${isErrorLine ? "bg-red-900/30" : ""}`}>
                    {/* Line Number */}
                    <div
                      className={`select-none px-3 py-0.5 text-right min-w-12 border-r ${
                        isErrorLine
                          ? "bg-red-800 text-red-100 border-red-600"
                          : "bg-gray-800 text-gray-500 border-gray-700"
                      }`}
                    >
                      {lineNumber + 1}
                    </div>

                    {/* Code Line */}
                    <div className="flex-1 px-3 py-0.5">
                      <span className={isErrorLine ? "text-red-100" : "text-gray-300"}>
                        {line || " "}
                      </span>
                      {isErrorLine && errorColumn !== null && (
                        <div className="text-red-400 whitespace-pre">
                          {" ".repeat(Math.max(0, errorColumn))}↑
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stack Trace - Compact */}
        {debugInfo.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Stack Trace
            </div>
            <div className="space-y-2">
              {debugInfo.map((frame, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                  {/* Frame Header */}
                  <div className="flex items-baseline gap-2 text-xs mb-1.5">
                    <span className="text-gray-400 font-mono">#{index}</span>
                    <span className="font-semibold text-gray-900">
                      {frame.functionName || "(global)"}
                    </span>
                    <span className="text-gray-500 font-mono">
                      {frame.location[0] + 1}:{frame.location[1] + 1}
                    </span>
                  </div>

                  {/* Variables - Inline compact grid */}
                  {frame.variables.length > 0 && (
                    <div className="pl-6 grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0.5 text-xs font-mono">
                      {frame.variables.map(([name, value], varIndex) => (
                        <div key={varIndex} className="flex gap-1.5 items-baseline min-w-0">
                          <span className="text-blue-600 shrink-0">{name}:</span>
                          <span className="text-gray-700 truncate" title={value}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
