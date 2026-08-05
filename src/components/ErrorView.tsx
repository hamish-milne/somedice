interface ErrorViewProps {
  title?: string;
  description?: string;
  codeSnippet?: string;
  errorLine?: number;
}

export function ErrorView({
  title = "Syntax Error",
  description = "Unexpected token in expression. Expected a number or variable name.",
  codeSnippet = `output "damage" 1d6 + 2d4
loop x over 1..10
  result x * invalid_token
end`,
  errorLine = 3,
}: ErrorViewProps) {
  const lines = codeSnippet.split("\n");

  return (
    <div className="h-full flex flex-col bg-white p-6">
      <div className="max-w-3xl mx-auto w-full">
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
          <p className="text-gray-600 ml-13">{description}</p>
        </div>

        {/* Code Snippet with Error Highlight */}
        <div className="bg-gray-50 rounded-lg border-2 border-red-200 overflow-hidden">
          <div className="bg-gray-800 text-gray-300 px-4 py-2 text-sm font-semibold">
            Code Snippet
          </div>
          <div className="font-mono text-sm">
            {lines.map((line, index) => {
              const lineNumber = index + 1;
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
                    {lineNumber}
                  </div>

                  {/* Code Line */}
                  <div className="flex-1 px-4 py-2 relative">
                    {isErrorLine && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                    )}
                    <span className={isErrorLine ? "text-gray-900" : "text-gray-700"}>
                      {line || " "}
                    </span>
                    {isErrorLine && (
                      <span className="ml-2 text-red-600 font-bold">← Error here</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex gap-2">
            <svg
              className="w-5 h-5 text-blue-600 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Suggestion</p>
              <p className="text-blue-800">
                Check your syntax at line {errorLine}. Make sure all variable names are valid and
                all expressions are properly formatted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
