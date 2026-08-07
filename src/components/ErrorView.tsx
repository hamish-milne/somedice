import { useStore, useWatch } from "tinystate";
import { valueToString } from "../lib/common";

const ERROR_TITLES = {
  syntax: "Syntax Error",
  compiler: "Compilation Error",
  runtime: "Runtime Error",
  unknown: "Unknown Error",
};

const ERROR_CONTEXT = 3; // Number of lines of context to show around the error line

export function ErrorView() {
  const store = useStore();
  const inputCode = useWatch(store, "inputCode");
  const error = useWatch(store, "error");

  if (!error) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <p className="text-gray-500">No error to display</p>
      </div>
    );
  }

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
    <div className="h-full overflow-auto bg-white p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Error Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
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
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          </div>
          <p className="text-gray-600 ml-13">{message}</p>
        </div>

        {/* Code Snippet with Error Highlight */}
        {errorLine !== null && (
          <div className="bg-gray-50 rounded-lg border-2 border-red-200 overflow-hidden mb-6">
            <div className="bg-gray-800 text-gray-300 px-4 py-2 text-sm font-semibold flex justify-between items-center">
              <span>Code Snippet</span>
              {errorColumn !== null && (
                <span className="text-xs">
                  Line {errorLine + 1}, Column {errorColumn + 1}
                </span>
              )}
            </div>
            <div className="font-mono text-sm">
              {snippetLines.map((line, index) => {
                const lineNumber = snippetStart + index;
                const isErrorLine = lineNumber === errorLine;

                return (
                  <div
                    key={index}
                    className={`flex ${isErrorLine ? "bg-red-50" : ""} hover:bg-gray-100`}
                  >
                    {/* Line Number */}
                    <div
                      className={`select-none px-4 py-2 text-right min-w-12 ${
                        isErrorLine
                          ? "bg-red-200 text-red-900 font-bold"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {lineNumber + 1}
                    </div>

                    {/* Code Line */}
                    <div className="flex-1 px-4 py-2 relative">
                      {isErrorLine && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                      )}
                      <span className={isErrorLine ? "text-gray-900" : "text-gray-700"}>
                        {line || " "}
                      </span>
                      {isErrorLine && errorColumn !== null && (
                        <div className="mt-1">
                          <span className="text-red-600 whitespace-pre">
                            {" ".repeat(Math.max(0, errorColumn))}↑ Error here
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stack Trace */}
        {debugInfo.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Stack Trace</h3>
            <div className="space-y-3">
              {debugInfo.map((frame, index) => (
                <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-gray-600">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {frame.functionName || "(global)"}
                        </span>
                        <span className="text-sm text-gray-500">
                          at line {frame.location[0] + 1}, column {frame.location[1] + 1}
                        </span>
                      </div>

                      {/* Variables */}
                      {frame.variables.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-semibold text-gray-600 mb-1">Variables:</div>
                          <div className="bg-white rounded border border-gray-200 p-2">
                            <div className="grid grid-cols-1 gap-1 font-mono text-xs">
                              {frame.variables.map(([name, value], varIndex) => (
                                <div key={varIndex} className="flex gap-2">
                                  <span className="text-blue-600 font-semibold">{name}:</span>
                                  <span className="text-gray-700 break-all">
                                    {valueToString(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
