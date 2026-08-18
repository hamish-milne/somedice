/// <reference lib="webworker" />
import { BaseError, type DebugInfo, type Output } from "./common";
import { parseProgram } from "./parser";
import { execute, getDebugInfo, newState } from "./vm";

export type InputMessage = { type: "run"; programText: string };

export type OutputMessage =
  | {
      type: "error";
      errorType: "syntax" | "compiler" | "runtime" | "unknown";
      message: string;
      debugInfo: DebugInfo[];
    }
  | { type: "progress"; opCount: number; pcMax: number; programSize: number }
  | { type: "result"; outputs: Output[]; opCount: number };

const OPS_PER_PROGRESS_UPDATE = 100_000;

class RuntimeError extends BaseError {
  constructor(message: string, debugInfo: DebugInfo[]) {
    super(message, debugInfo);
  }

  override errorType() {
    return "runtime" as const;
  }
}

export function* runProgram(
  programText: string,
): Generator<OutputMessage, void, unknown> {
  try {
    yield { type: "progress", opCount: 0, pcMax: 0, programSize: 1 };
    const program = parseProgram(programText);
    const state = newState(program);

    try {
      while (!execute(state, state.opCount + OPS_PER_PROGRESS_UPDATE)) {
        yield {
          type: "progress",
          opCount: state.opCount,
          pcMax: state.pcMax,
          programSize: state.program.code.length,
        };
      }
    } catch (e) {
      console.error(e);
      let debugInfo: DebugInfo[];
      let message: string;
      try {
        debugInfo = getDebugInfo(state);
        message = e instanceof Error ? e.message : String(e);
      } catch (e1) {
        console.error(e1);
        throw e;
      }
      throw new RuntimeError(message, debugInfo);
    }
    yield { type: "result", outputs: state.outputs, opCount: state.opCount };
  } catch (e) {
    if (e instanceof BaseError) {
      yield {
        type: "error",
        errorType: e.errorType(),
        message: e.message,
        debugInfo: e.debugInfo,
      };
    } else {
      console.error(e);
      yield {
        type: "error",
        errorType: "unknown",
        message: String(e),
        debugInfo: [],
      };
    }
  }
}

self.onmessage = (event: MessageEvent<InputMessage>) => {
  const { type, programText } = event.data;
  switch (type) {
    case "run":
      for (const message of runProgram(programText)) {
        self.postMessage(message);
      }
      break;
  }
};
